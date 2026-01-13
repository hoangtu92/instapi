// redisClient.js
const { createClient } = require('redis');
const {LOG} = require("./helpers");
const {getConfig, saveConfig, randomAccount} = require("./config");

const Redis = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

Redis.on('error', err => {
    LOG.error('Redis error:', err);
});

if(!Redis.isOpen){
    Redis.connect().then(async r => {
        LOG.log("Redis cache ready");
        await Redis.set("instapi_config", JSON.stringify(getConfig()));
    });
}
/**
 *
 * @returns {Promise<any>}
 */
const getCurrentConfig = async () => {
    let config = await Redis.get("instapi_config");
    return JSON.parse(config);
}
/**
 *
 * @param config
 * @returns {Promise<TypeMapping[95 | 36 | 43] extends MappedType<infer T> ? ReplyWithTypeMapping<Extract<null | string | Buffer<ArrayBufferLike>, T>, TypeMapping> : ReplyWithTypeMapping<null | string, TypeMapping>>}
 */
const setConfig = async (config) => {
    saveConfig(config)
    return await Redis.set("instapi_config", JSON.stringify(config));
}
/**
 *
 * @returns {Promise<*>}
 */
const setRandomAccount = async () => {
    const currentConfig = await getCurrentConfig();
    let config =  await randomAccount();
    if(currentConfig.ig_username === config.ig_username){
        return  await setRandomAccount();
    }
    await setConfig(config);
    return config;
}

module.exports = {Redis, getCurrentConfig, setConfig, setRandomAccount};
