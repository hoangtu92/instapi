const Redis = require('../infra/redis');
const LOG = require("../helpers/log");
const Helper = require("../helpers/helpers");
const cachePolicy = require("./cache.policy");
const api = require("../clients/instaxios.instance")


/**
 *
 * @param type
 * @param postData
 * @returns {Promise<any>}
 */
async function graphql(type, postData) {

    if(!cachePolicy[type]){
        throw new Error("No cache policy")
    }

    try{
        return await api.post("https://www.instagram.com/graphql/query", postData).then(res => res.data).then(res => {
            return cachePolicy[type].pick(res) || null
        });

    }
    catch (e) {
        throw e;
    }
}

/**
 *
 * @param pk
 * @returns {Promise<any>}
 */
async function get_media_info(pk){

    return await api.get(
        `https://www.instagram.com/api/v1/media/${pk}/info/`,
        {
            headers: {
                'content-type': 'application/json; charset=utf-8',
            }
        }
    ).then(res => res.data);
}

/**
 *
 * @param type
 * @param postData
 * @param hour
 * @returns {Promise<*>}
 */
async function request(type, postData, hour = 1){

    const key = Helper.cacheKey(type, postData);
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
            const data = await graphql(type, postData);

            if(data){

                // 3️⃣ store cache
                await Redis.set(key, JSON.stringify(data), {
                    EX: hour * 60 * 60
                });
            }

            return data;
        }
        finally{
            // Release lock
            await Redis.del(lockKey);
        }

    }

    try{
        // 3️⃣ Another request is fetching → wait & retry
        for (let i = 0; i < 20; i++) { // ~2 seconds max
            await new Promise(r => setTimeout(r, 100))

            const retry = await Redis.get(key);
            if (retry) {
                return JSON.parse(retry);
            }
        }
    }
    catch (e) {
        console.log(e)
        return null;
    }



    // 4️⃣ Fallback (lock holder crashed)
    return await graphql(type, postData);
}


module.exports = {request, get_media_info};
