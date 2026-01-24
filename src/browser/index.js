const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const os = require("os");
const path = require("path");
const {USER_AGENT} = require("../constants/browser.constant");
const Config = require("../services/config.service");
const LOG = require("../helpers/log");
const Helper = require("../helpers/helpers");

puppeteer.use(StealthPlugin());

class Browser {
    browserInstance = null;

    constructor({config, headless, userAgent} = {}) {
        this.config = config;
        this.userAgent = userAgent || USER_AGENT;
        this.headless = headless  || false;
        return this;
    }

    /**
     * Launch (singleton) browser with optional proxy
     */
    async init() {

        if (!this.config || !this.config.proxy_host || !this.config.proxy_port) {
            throw new Error("No proxy available");
        }

        // Proxy changed → restart browser
        if (this.browserInstance) {
            await this.closeBrowser();
        }

        let options = {
            headless: this.headless,
            args: [
                '--incognito',
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                `--proxy-server=http://${this.config.proxy_host}:${this.config.proxy_port}`,
            ],
            defaultViewport: {
                width: 1280,
                height: 800,
            },
        }

        //options.executablePath = '/usr/bin/google-chrome-stable';
        //options.userDataDir = path.join(os.homedir(), 'chrome-profile');

        this.browserInstance = await puppeteer.launch(options);

        this.browserContext = await this.browserInstance.defaultBrowserContext();
        this.page = await this.createPage();

        return this;
    }


    /**
     * Create a page with sane defaults
     */
    async createPage(options = {}) {
        if(!this.browserInstance || !this.browserContext){
            throw Error("No browser or context found")
        }
        const page = (await this.browserContext.pages())[0];

        await page.setUserAgent(this.userAgent);

        // Proxy authentication (if needed)
        await page.authenticate({
            username: this.config.proxy_username,
            password: this.config.proxy_pass,
        });

        if (options.intercept) {
            await page.setRequestInterception(true);
        }

        return page;
    }


    /**
     * Gracefully close browser
     */
    async closeBrowser() {
        if (!this.browserInstance) return;

        try {
            if(this.page && !this.page.isClosed()) {
                await this.page.close({ runBeforeUnload: false });
            }

            await this.browserInstance.close();
        } finally {
            this.page = null;
            this.browserContext = null;
            this.browserInstance = null;
        }
    }
}



module.exports = Browser
