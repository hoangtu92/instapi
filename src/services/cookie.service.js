const LOG = require("../helpers/log");
const fs = require("fs");
const Config = require("./config.service");
const path = require("path");
const crypto = require("crypto");

const COOKIE_DIR = path.resolve(process.cwd(), "storages/cookies/");

class CookieService {


    /**
     * Ensure params directory exists
     */
    ensureDir() {
        fs.mkdir(COOKIE_DIR, { recursive: true }, () => {
            console.log("Cookies directory exists")
        });
    }
    /**
     *
     * @returns {string}
     * @param ig_username
     */
    getPath (ig_username) {
        return path.resolve("storages/cookies/" + crypto
            .createHash("sha256")
            .update(ig_username)
            .digest("hex") + ".json");
    }

    serialize(cookies) {
        return cookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
    }
    /**
     *
     * @param ig_username
     * @param page
     * @returns {Promise<void>}
     */
    async load (ig_username, page) {
        const cookiesPath = this.getPath(ig_username);

        const cookies = Config.readJson(cookiesPath);
        if(cookies){
            await page.setCookie(...cookies);
            LOG.log("Cookies loaded");
        }
    }

    /**
     *
     * @param ig_username
     * @param cookies
     */
    save (ig_username, cookies) {
        this.ensureDir();
        LOG.info("Save Cookie", ig_username)
        const cookiesPath = this.getPath(ig_username);
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        LOG.log("Cookies saved");
    }

    /**
     *
     * @param ig_username
     * @returns {null|any}
     */
    get (ig_username) {

        try{
            const cookiesPath = this.getPath(ig_username);

            return JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        }
        catch (e) {
            return null;
        }
    }

    available(ig_username){
        return fs.existsSync(this.getPath(ig_username));
    }
}


module.exports = new CookieService()
