// redisClient.js
const { createClient } = require('redis');
const LOG = require("./log");

const Redis = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

Redis.on('error', err => {
    LOG.error('Redis error:', err);
});

if(!Redis.isOpen){
    Redis.connect().then(async r => {
        LOG.log("Redis cache ready");
    });
}

module.exports = Redis;
