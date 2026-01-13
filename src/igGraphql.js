const axios = require("axios");
const {HttpsProxyAgent} = require("https-proxy-agent");
let {graphqlData} = require("./browser")
const crypto = require("crypto");
const {Redis, getCurrentConfig} = require('./redis');
const {getCookieHeader} = require("./cookie");
const {LOG} = require("./helpers");

const client = axios.create({
    timeout: 15000,
    headers : {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": "936619743392459",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/",
    },
});

/**
 *
 * @returns {HttpsProxyAgent<string>}
 */
async function getHttpAgent() {
    let config = await getCurrentConfig();
    let proxy_str = `http://${config.proxy_username}:${config.proxy_pass}@${config.proxy_host}:${config.proxy_port}`;
    return new HttpsProxyAgent(proxy_str);

}

/**
 *
 * @param type
 * @param variables
 * @returns {Promise<any>}
 */
async function graphql(type, variables) {

    let requestData = graphqlData[type];
    const cookie = await getCookieHeader();

    if(!requestData) {
        throw new Error("Request data not found");
    }

    let headers = requestData.headers;
    let postData = requestData.postData;

    postData.variables =  JSON.stringify(variables);
    postData.__req = postData.__req || '0';
    postData.__req = (parseInt(postData.__req, 16) + 1).toString(16);

    const postDataStr = new URLSearchParams(postData).toString();

    headers['content-length'] = Buffer.byteLength(postDataStr);
    headers['accept-encoding'] = 'gzip, deflate, br';
    headers["cookie"] = cookie;

    postData.variables =  variables;
    let httpsAgent = await getHttpAgent();

    const res = await client.post(
        "https://www.instagram.com/graphql/query",
        postDataStr,
        {
            headers,
            httpsAgent
        }
    );

    return res.data;
}

/**
 *
 * @param pk
 * @returns {Promise<any>}
 */
async function get_media_info(pk){

    let httpsAgent = await getHttpAgent();
    const cookie = await getCookieHeader();

    let headers = {
        'content-type': 'application/json; charset=utf-8',
        'accept-encoding': 'gzip, deflate, br',
        cookie
    };

    const res = await client.get(
        `https://www.instagram.com/api/v1/media/${pk}/info/`,
        {
            headers,
            httpsAgent
        }
    );

    return res.data;

}

/**
 *
 * @param ms
 * @returns {Promise<unknown>}
 */
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
/**
 *
 * @param type
 * @param variables
 * @param hour
 * @returns {Promise<*>}
 */
async function request(type, variables, hour = 1){
    const key = cacheKey(type, variables);
    const lockKey = `${key}:lock`;

    // 1️⃣ try cache
    const cached = await Redis.get(key);
    if (cached) {
        LOG.info("Cache hit", key)
        return JSON.parse(cached);
    }

    // 2️⃣ Acquire lock (single-flight)
    const lock = await Redis.set(lockKey, '1', {
        NX: true,
        EX: 15 // lock auto-release safety
    });

    if(lock){
        try{
            // 2️⃣ cache miss → fetch
            const data = await graphql(type, variables);

            // 3️⃣ store cache
            await Redis.set(key, JSON.stringify(data), {
                EX: hour * 1000 * 60* 60
            });
        }
        finally{
            // Release lock
            await Redis.del(lockKey);
        }

    }

    // 3️⃣ Another request is fetching → wait & retry
    for (let i = 0; i < 20; i++) { // ~2 seconds max
        await sleep(100);

        const retry = await Redis.get(key);
        if (retry) {
            return JSON.parse(retry);
        }
    }

    // 4️⃣ Fallback (lock holder crashed)
    return await graphql(type, variables);
}


/**
 *
 * @returns {string}
 * @param type
 * @param variables
 */
function cacheKey(type, variables) {
    const hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(variables))
        .digest("hex");

    return `graphql:${type}:${hash}`;
}


module.exports = {request, get_media_info};
