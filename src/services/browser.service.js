const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Browser = require("../browser/index");
const {loginAction} = require("../browser/actions/login.action");
const LOG = require("../helpers/log");
const Helper = require("../helpers/helpers");
const CookieService = require("../services/cookie.service");
const ParamsService = require("../services/params.service");

puppeteer.use(StealthPlugin());

class BrowserService {
    /**
     *
     * @param config
     * @param headless
     * @returns {Promise<Object>}
     */
    async login({config, headless}) {
        LOG.info('[browser] login start', config.ig_username);

        const browser = await new Browser({config, headless}).init();

        if(CookieService.available(config.ig_username)){
            await CookieService.load(config.ig_username, browser.page);
        }

        try {
            const auth = await loginAction({
                page: browser.page,
                config: browser.config,
                headless: browser.headless,
            });

            const ig_username = browser.config.ig_username;

            await CookieService.save(ig_username, auth.cookies);
            await ParamsService.save(ig_username, auth.params);


        } finally {
            if(browser){
                await browser.closeBrowser();
                process.exit(0);
            }
        }
    }
}

module.exports = new BrowserService();
