const fs = require("fs");
const path = require("path");
const LOG = require("../helpers/log");

class ConfigService {

    constructor() {
        this.accountsPath = path.resolve(process.cwd(), "storages/accounts.json");
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
     * @returns {Promise<null|any>}
     */
    async getConfigs() {
        try{
            const fileConfig = this.readJson(this.accountsPath);
            if (fileConfig) {
                return fileConfig;
            }
        }
        catch (e) {
            LOG.error("Invalid config file");
        }

        return null;
    }

    /**
     *
     * @param config
     * @returns {Promise<void>}
     */
    async saveConfigs(config) {
        this.saveJson(this.accountsPath, config);
    }


    /**
     *
     * @param ig_username
     * @returns {null|*}
     */
    getConfig(ig_username){
        const accounts = this.readJson(this.accountsPath);

        if(accounts){
            return accounts.find(e => e.ig_username === ig_username);
        }
        return null;
    }

}

module.exports = new ConfigService();
