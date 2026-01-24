/**
 *
 * @param ttl
 * @returns {Promise<unknown>}
 */
const LOG = require("./log");
const Config = require("../services/config.service");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {HttpsProxyAgent} = require("https-proxy-agent");

class Helper{

    static async waitForTimeout (ttl = 0){
        if(!ttl) ttl = Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000;
        LOG.info(`Waiting for ${ttl/1000} seconds`)
        return await new Promise(r => setTimeout(r, ttl));
    }


    /**
     *
     * @returns {string}
     * @param type
     * @param variables
     */
    static cacheKey (type, variables) {
        const hash = crypto
            .createHash("sha256")
            .update(JSON.stringify(variables))
            .digest("hex");

        return `graphql:${type}:${hash}`;
    }

    /**
     *
     * @returns {HttpsProxyAgent<string>}
     */
    static async getHttpAgent () {
        let config = await Config.getCurrentConfig();
        let proxy_str = `http://${config.proxy_username}:${config.proxy_pass}@${config.proxy_host}:${config.proxy_port}`;
        return new HttpsProxyAgent(proxy_str);
    }






    /**
     *
     * @param page
     * @param name
     * @returns {Promise<void>}
     */
    static async takeScreenshot (page, name){
        if (page && !page.isClosed()) {
            await page.screenshot({path: `screens/${name}.png`, fullPage: true});
        }
    }

}

module.exports = Helper
