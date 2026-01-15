const fs = require("fs");
const path = require("path");
const LOG = require("./log");
const Redis = require("./redis");

class Config {

    constructor() {
        this.accountsPath = path.resolve(process.cwd(), "accounts.json");
        this.configsPath  = path.resolve(process.cwd(), "config.json");
        this.paramsPath   = path.resolve(process.cwd(), "params.json");
    }

    /**
     *
     * @param filename
     * @returns {Promise<null|any>}
     */
    readJson(filename) {
        try {
            const data = fs.readFileSync(filename, "utf8");
            return JSON.parse(data);
        } catch (err) {
            LOG.error("Failed to read JSON:", err.message);
            return null;
        }
    }

    /**
     *
     * @param filename
     * @param object
     * @returns {boolean}
     */
    saveJson(filename, object) {
        try {
            fs.writeFileSync(
                filename,
                JSON.stringify(object, null, 2),
                { encoding: "utf8" }
            );
            return true;
        } catch (err) {
            LOG.error("Failed to write JSON:", err.message);
            return false;
        }
    }

    /**
     *
     * @returns {Promise<*|null>}
     */
    getGraphqlData() {
        return this.readJson(this.paramsPath);
    }

    /**
     *
     * @param graphqlData
     * @returns {boolean}
     */
    saveGraphqlData(graphqlData) {
        return this.saveJson(this.paramsPath, graphqlData);
    }

    /**
     *
     * @returns {Promise<*|null>}
     */
    async getCurrentConfig() {

        try {
            const cached = await Redis.get("instapi_config");
            if(cached) return JSON.parse(cached);
        }
        catch (e) {
            LOG.error("Invalid config in Redis, reloading from file");
        }


        const fileConfig = this.readJson(this.configsPath);
        if (fileConfig) {
            await Redis.set("instapi_config", JSON.stringify(fileConfig));
            return fileConfig;
        }
    }

    /**
     *
     * @param config
     * @returns {Promise<*>}
     */
    async setCurrentConfig(config) {
        this.saveJson(this.configsPath, config);
        await Redis.set("instapi_config", JSON.stringify(config));
        return config;
    }

    /**
     *
     * @returns {Promise<boolean|*>}
     */
    async setRandomAccount() {
        const currentConfig = await this.getCurrentConfig();
        const accounts = this.readJson(this.accountsPath);

        if (!accounts || accounts.length === 0) return false;

        const candidates = accounts.filter(
            acc => acc.ig_username !== currentConfig?.ig_username
        );

        if (candidates.length === 0) return false;

        const index = Math.floor(Math.random() * candidates.length);
        return this.setCurrentConfig(candidates[index]);
    }

}

module.exports = new Config();
