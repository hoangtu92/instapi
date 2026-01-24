const fs = require("fs");
const path = require("path");
const LOG = require("../helpers/log");
const Redis = require("../infra/redis");

class ConfigService {

    constructor() {
        this.accountsPath = path.resolve(process.cwd(), "storages/accounts.json");
        this.configsPath  = path.resolve(process.cwd(), "storages/config.json");
    }

    /**
     *
     * @param filename
     * @returns {null|any}
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
        return null
    }



    getConfig(ig_username){
        const accounts = this.readJson(this.accountsPath);

        if(accounts){
            return accounts.find(e => e.ig_username === ig_username);
        }
        return null;
    }

    /**
     *
     * @param config
     * @returns {Promise<*>}
     */
    async setCurrentConfig(config) {
        this.saveJson(this.configsPath, config);
        await Redis.set("instapi_config", JSON.stringify(config));
        LOG.log("Account changed to: ", config.ig_username);
        return config;
    }

    /**
     *
     * @returns {Promise<boolean|*>}
     */
    async getRandomAccount() {
        const currentConfig = await this.getCurrentConfig();

        try{
            const accounts = this.readJson(this.accountsPath);
            const candidates = accounts.filter(
                acc => acc.ig_username !== currentConfig?.ig_username
            );
            const index = Math.floor(Math.random() * candidates.length);

            return candidates[index];
        }
        catch (e) {
            return currentConfig;
        }

    }

    /**
     *
     * @returns {Promise<boolean|*>}
     */
    async setRandomAccount() {
        const account = await this.getRandomAccount();
        if(account)
            return this.setCurrentConfig(account);
    }

}

module.exports = new ConfigService();
