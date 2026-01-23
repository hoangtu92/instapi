const axios = require("axios");
let {graphqlData} = require("./browser")
const Redis = require('./redis');
const LOG = require("./log");
const Helper = require("./helpers");

let httpsAgent

(async () => {
    httpsAgent = await Helper.getHttpAgent();
})();



const client = axios.create({
    timeout: 15000,
    headers : {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/",
    },
});



/**
 *
 * @param type
 * @param variables
 * @returns {Promise<any>}
 */
async function graphql(type, variables) {

    let requestData = graphqlData[type];
    const cookie = await Helper.getCookieHeader();

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

    const res = await client.post(
        "https://www.instagram.com/graphql/query",
        postDataStr,
        {
            headers,
            httpsAgent
        }
    );

    let result = res.data;
    if(result.data){
        switch(type){
            case "PolarisSearchBoxRefetchableQuery":
                result = result.data.xdt_api__v1__fbsearch__topsearch_connection.users;
                break;
            case "PolarisProfilePageContentQuery":
                result = result.data.user;
                break;
            case "PolarisProfilePostsQuery":
                result = result.data.xdt_api__v1__feed__user_timeline_graphql_connection;
                break;
            case "PolarisStoriesV3ReelPageStandaloneQuery":
                result = result.data.xdt_api__v1__feed__reels_media.reels_media;
                break;
            case "PolarisProfileStoryHighlightsTrayContentQuery":
                result = result.data.highlights;
                break;
            case "PolarisStoriesV3HighlightsPageQuery":
                result = result.data.xdt_api__v1__feed__reels_media__connection.edges;
                break;
            case "PolarisProfileReelsTabContentQuery":
                result = result.data.xdt_api__v1__clips__user__connection_v2;
                break;

            default:
                result = result.data;
                break;
        }
    }
    else{
        LOG.error(JSON.stringify(result.errors));
        result = null;
        throw Error("Please try again");
    }

    return result;
}

/**
 *
 * @param pk
 * @returns {Promise<any>}
 */
async function get_media_info(pk){

    const cookie = await Helper.getCookieHeader();

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
 * @param type
 * @param variables
 * @param hour
 * @returns {Promise<*>}
 */
async function request(type, variables, hour = 1){
    const key = Helper.cacheKey(type, variables);
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

            if(data){
                // 3️⃣ store cache
                await Redis.set(key, JSON.stringify(data), {
                    EX: hour * 60 * 60
                });
            }
        }
        finally{
            // Release lock
            await Redis.del(lockKey);
        }

    }

    // 3️⃣ Another request is fetching → wait & retry
    for (let i = 0; i < 20; i++) { // ~2 seconds max
        await new Promise(r => setTimeout(r, 100))

        const retry = await Redis.get(key);
        if (retry) {
            return JSON.parse(retry);
        }
    }

    // 4️⃣ Fallback (lock holder crashed)
    return await graphql(type, variables);
}




module.exports = {request, get_media_info};
