/**
 *
 * @param ttl
 * @returns {Promise<unknown>}
 */
const LOG = require("./log");
const Config = require("./config");
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
     * @param headers
     * @returns {*}
     */
    static convertHeaders (headers) {
        // Convert HTTP/2 :authority → Host
        if (headers[':authority'] && !headers['host']) {
            headers['host'] = headers[':authority'];
        }

        // Remove HTTP/2 pseudo-headers (INVALID in HTTP/1.1)
        delete headers[':authority'];
        delete headers[':method'];
        delete headers[':path'];
        delete headers[':scheme'];

        return headers;
    }

    /**
     *
     * @returns {Promise<void>}
     */
    static async saveCookies (page) {
        if (!page) return;
        let config = await Config.getCurrentConfig();
        LOG.info("Save Cookie", config.ig_username)
        const cookiesPath = await Helper.getCookiePath(config);
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        LOG.log("Cookies saved");
    }

    /**
     * Clear cookies
     * @returns {Promise<void>}
     */
    static async clearCookies (page){
        let config = await Config.getCurrentConfig();
        LOG.info("Clear Cookie", config.ig_username)
        const cookiesPath = await Helper.getCookiePath(config);
        try{
            const cookies = await page.cookies();
            await page.deleteCookie(...cookies);
            await fs.rmSync(cookiesPath)
        }
        catch (e) {
            LOG.info(e.message);
        }
    }


    /**
     *
     * @returns {null|*}
     */
    static async getCookieHeader () {
        try{
            let config = await Config.getCurrentConfig();
            const cookiesPath = await Helper.getCookiePath(config);
            const cookies = JSON.parse(fs.readFileSync(cookiesPath));

            return cookies
                .map(c => `${c.name}=${c.value}`)
                .join("; ");
        }
        catch (e) {
            return null;
        }
    }

    /**
     *
     * @param page
     * @returns {Promise<void>}
     */
    static async loadCookies (page) {
        let config = await Config.getCurrentConfig();
        const cookiesPath = await Helper.getCookiePath(config);

        const cookies = await Config.readJson(cookiesPath);
        if(cookies){
            await page.setCookie(...cookies);
            LOG.log("Cookies loaded");
        }
    }

    /**
     *
     * @returns {Promise<string>}
     */
    static async getCookiePath (config) {
        return path.resolve("cookies/" + crypto
            .createHash("sha256")
            .update(JSON.stringify(config))
            .digest("hex") + ".json");
    }
    /**
     *
     * @returns {Promise<void>}
     */
    static async closeModal (page){
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('div[role="button"]');
            for (const btn of buttons) {
                const svgClose = btn.querySelector('svg[aria-label="Close"]');
                if (svgClose) {
                    btn.scrollIntoView({block: "center"});
                    btn.click();
                }
            }
        })
    }


    /**
     *
     * @returns {Promise<void>}
     */
    static async triggerSearchQuery(page){
        try{
            LOG.info("Searching")
            await page.evaluate(() => {
                document.querySelector('[aria-label="Search"]')
                    .closest('div')
                    .click();
            });

            const input = page.locator('input[placeholder="Search"]');
            await input.wait();

            await page.type(
                'input[placeholder="Search"]',
                'daily',
                { delay: 500 }   // 500 ms between each keystroke
            );

            await page.evaluate(() => {
                document.querySelector('[aria-label="Search"]')
                    .closest('div')
                    .click();
            });
        }
        catch (e) {
            LOG.error(e.message)
        }

        await Helper.waitForTimeout();
    }

    /**
     *
     * @returns {Promise<void>}
     */
    static async triggerProfileQuery(page) {
        try{
            LOG.info("Retrieve Profile")
            await page.goto("https://www.instagram.com/dailyfashion_news/", {waitUntil: "networkidle2"});
        }
        catch (e) {
            LOG.error("Profile", e.message);
        }


        await Helper.waitForTimeout();
    }
    /**
     *
     * @returns {Promise<void>}
     */
    static async triggerReelQuery(page) {
        try{
            LOG.info("Retrieve Reels")
            await page.goto("https://www.instagram.com/dailyfashion_news/reels/", {waitUntil: "networkidle2"});
        }
        catch (e) {
            LOG.error("Reels", e.message)
        }

        await Helper.waitForTimeout();
    }

    /**
     *
     * @returns {Promise<void>}
     */
    static async triggerStoryQuery(page) {
        try{
            LOG.info("Retrieve story");
            const clicked = await page.evaluate(() => {
                const buttons = document.querySelectorAll('div[role="button"]');

                for (const btn of buttons) {
                    const hasCanvas = btn.querySelector('canvas');
                    const img = btn.querySelector('img[alt*="profile picture"]');

                    if (hasCanvas && img) {
                        btn.scrollIntoView({ block: "center" });
                        btn.click();
                        return true;
                    }
                }

                return false;
            });

            if(clicked){
                await Helper.closeModal(page);
            }
            else{
                LOG.warn("Story not found")
            }
        }
        catch (e) {
            LOG.error(e.message)
        }


        await Helper.waitForTimeout();
    }
    /**
     *
     * @returns {Promise<void>}
     */
    static async triggerHighLightQuery (page)  {
        try{
            LOG.info("Retrieve highlight");
            const highLightClicked = await page.evaluate(() => {
                const highlight = document.querySelector('a[href*="/stories/highlights"]');
                if(highlight){
                    const btn = highlight.querySelector('div[role="button"]');
                    if(btn){
                        btn.click();
                        return true;
                    }
                }
                return false;
            });

            if(highLightClicked){
                await Helper.closeModal(page);
            }

        }
        catch (e) {
            LOG.error(e.message)
        }
        await Helper.waitForTimeout();
    }

    /**
     *
     * @param page
     * @param name
     * @returns {Promise<void>}
     */
    static async takeScreenshot (page, name){
        if (!page.isClosed()) {
            await page.screenshot({path: `screens/${name}.png`, fullPage: true});
        }
    }

    /**
     *
     * @returns {Promise<void>}
     */
    static async byPassCookieConsent (page) {
        try{
            await page.waitForSelector("text/Decline optional cookies");
            await page.click("text/Decline optional cookies");
            await Helper.takeScreenshot(page, "cookie-consent");
        }
        catch(e) {
            LOG.info("No cookie consent")
        }
    }
}

module.exports = Helper
