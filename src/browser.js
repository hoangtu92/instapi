const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require("path");
const os = require("os");
const {loadCookies, saveCookies, clearCookies} = require("./cookie");
const {getGraphqlData, saveGraphqlData} = require("./config");
const {LOG, waitForTimeout} = require("./helpers");
const {Redis, getCurrentConfig} = require("./redis");
const {eventEmitter} = require("./eventEmitter");

require('dotenv').config();

const tmpDir = "/tmp";
const homeDir = os.homedir();
let queryStack = [];
let detach = null;


puppeteer.use(StealthPlugin());

let browser = null;
let page = null;
let graphqlData = getGraphqlData();

const isProduction = process.env.NODE_ENV === "production";
if (process.env.NODE_ENV === "production") {
    LOG.log("Running in production mode");
}

let action = 'init', previous_action = 'init';
let ready = false;

/**
 *
 * @returns {Promise<void>}
 */
const closeModal = async () => {
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
 * @param headers
 * @returns {*}
 */
const convertHeaders = (headers) => {
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
 * @param page
 * @returns {(function(): void)|*}
 */
function attachPageEvents(page) {
    /**
     *
     * @param res
     * @returns {Promise<void>}
     */
    const onRequestFinished = async (res) => {
        try{
            const type = res.resourceType();
            const response = res.response();
            if(!res.url().includes("https://www.instagram.com")) return;

            let status = response.status();
            if(status < 200 || status > 300) return;

            if(type === "document"){
                if (res.url().includes("codeentry")) {
                    action = "verify"
                }
                else if (res.url().includes("challenge")) {
                    action = "challenge"
                }
                else if (res.url().includes('/accounts/login')) {
                    action = "login"
                }
                else if (res.url().includes("onetap")) {
                    action = "save_info"
                }
                else if (res.url().includes("consent")) {
                    action = "consent"
                }
                else{
                    action = "logged_in"
                }

                if(action !== previous_action){

                    LOG.log(status, type, res.url());
                    LOG.info("From ", previous_action, "to", action);

                    eventEmitter.emit(action, res);
                    previous_action = action;
                }
            }
        }
        catch (e) {
            LOG.error(e.message)
        }
    }
    /**
     *
     * @returns {Promise<void>}
     * @param response
     */
    const onPageResponse = async (response) => {

        try{
            let status = response.status();
            if(status < 200 || status > 300) return;

            const request = response.request();

            if (request.method() === 'POST' && request.url().includes('/graphql/query')) {

                const postData = await request.fetchPostData();
                const postDataObj = new URLSearchParams(postData);


                const request_name = postDataObj.get("fb_api_req_friendly_name");

                let obj = Object.fromEntries(postDataObj);

                if(obj.variables)
                    obj.variables = JSON.parse(obj.variables);

                let headers = request.headers()
                headers = convertHeaders(headers);

                if(request_name){

                    if(!queryStack.includes(request_name)){
                        queryStack.push(request_name);
                        eventEmitter.emit("request_update", {response, request_name})
                    }

                    graphqlData[request_name] = {
                        headers: headers,
                        postData: obj
                    };

                }

                if(!ready) {
                    eventEmitter.emit("serve", request)
                    ready = true;
                    await saveCookies(page);
                }

            }
        }
        catch (e) {
            LOG.error(e.message)
        }

    }

    page.on("response", onPageResponse);
    page.on("requestfinished", onRequestFinished);

    return () => {
        page.off("response", onPageResponse);
        page.off("requestfinished", onRequestFinished);
    };
}

/**
 *
 * @returns {Promise<void>}
 */
const triggerSearchQuery = async () => {
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

    await waitForTimeout();
}

/**
 *
 * @returns {Promise<void>}
 */
const triggerProfileQuery = async () => {
    try{
        LOG.info("Retrieve Profile")
        await page.goto("https://www.instagram.com/dailyfashion_news/", {waitUntil: "networkidle2"});
    }
    catch (e) {
        LOG.error("Profile", e.message)
    }


    await waitForTimeout();
}
/**
 *
 * @returns {Promise<void>}
 */
const triggerReelQuery = async () => {
    try{
        LOG.info("Retrieve Reels")
        await page.goto("https://www.instagram.com/dailyfashion_news/reels/", {waitUntil: "networkidle2"});
    }
    catch (e) {
        LOG.error("Reels", e.message)
    }

    await waitForTimeout();
}

/**
 *
 * @returns {Promise<void>}
 */
const triggerStoryQuery = async () => {
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
            await closeModal();
        }
        else{
            LOG.warn("Story not found")
        }
    }
    catch (e) {
        LOG.error(e.message)
    }


    await waitForTimeout();
}
/**
 *
 * @returns {Promise<void>}
 */
const triggerHighLightQuery = async () => {
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
            await closeModal();
        }

    }
    catch (e) {
        LOG.error(e.message)
    }
    await waitForTimeout();
}

/**
 *
 * @param response
 * @returns {Promise<void>}
 */
const loggedIn = async (response) =>{

    try{

        await waitForTimeout();

        await triggerSearchQuery();

        await triggerProfileQuery();

        await triggerReelQuery();

        await triggerStoryQuery();

        await triggerHighLightQuery();

    }
    catch (e){
        LOG.error(e.message)
    }

}

/**
 *
 * @returns {Promise<void>}
 */
async function startBrowser() {

    let config = await getCurrentConfig();
    await Redis.set("browser_state", "active")

    try{

        // Launch Puppeteer browser
        LOG.info("Launching Puppeteer...", config.ig_username);

        let options = {
            headless: isProduction, // set to true for production
            args: ["--no-sandbox",
                "--disable-setuid-sandbox",
                `--proxy-server=http://${config.proxy_host}:${config.proxy_port}`,
                "--disable-dev-shm-usage",
                "--no-zygote",
                "--single-process"
            ],
            defaultViewport: null,
        };

        if(isProduction){
            options.executablePath = '/usr/bin/google-chrome-stable';
            options.userDataDir = path.join(homeDir, 'chrome-profile');
        }

        // Launch Puppeteer browser
        browser = await puppeteer.launch(options);


        page = await browser.newPage();
    }
    catch (e) {
        LOG.error(e.message);
        return;
    }


    // Optional: set a default user-agent and viewport
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // authenticate proxy
    await page.authenticate({
        username: config.proxy_username,
        password: config.proxy_pass
    });

    await loadCookies(page);

    detach = attachPageEvents(page);
}

/**
 *
 * @returns {Promise<void>}
 */
async function startUp(){
    try{
        LOG.info("Try to login first.")
        await page.goto("https://www.instagram.com/accounts/login/", {waitUntil: "networkidle2"});
    }
    catch(e){
        LOG.error(e.message);
    }
}

/**
 *
 * @returns {Promise<void>}
 */
async function byPassCookieConsent() {
    try{
        await page.waitForSelector("text/Decline optional cookies");
        await page.click("text/Decline optional cookies");
        await takeScreenshot("cookie-consent");
    }
    catch(e) {
        LOG.info("No cookie consent")
    }
}
/**
 *
 * @param response
 * @returns {Promise<void>}
 */
async function login(response) {

    try{
        let config = await getCurrentConfig();

        LOG.info("Login process", config.ig_username);

        await byPassCookieConsent();

        await waitForTimeout();

        await page.waitForSelector('input[type="text"]', {visible: true});

        await page.type('input[type="text"]', config.ig_username, {delay: 50 + Math.random() * 100});
        await page.type('input[type="password"]', config.ig_password, {delay: 50 + Math.random() * 100});

        await page.waitForSelector('text/Log in', {visible: true});
        await page.click('text/Log in');
        LOG.info("Submitting login information");
        await takeScreenshot("submit-login");

        await waitForTimeout();

        await byPassCookieConsent();

    }
    catch (e) {
        LOG.error(e.message);
        await takeScreenshot("login-error");
        //await resetBrowser();
    }
}

/**
 *
 * @returns {Promise<void>}
 */
async function logout(){

    if(!isPageOk()) await startBrowser();
    await clearCookies(page);

    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');

    await resetBrowser();
}


let closing = false;
/**
 *
 * @returns {Promise<void>}
 */
async function closeBrowser() {
    try {
        LOG.info("Closing browser")
        if (page && !page.isClosed()) {
            detach?.();
            await page.close({ runBeforeUnload: false });
        }

        page = null;
        detach = null;
    } catch (e) {
        LOG.warn("Error closing browser:", e.message);
    } finally {
        await Redis.set("browser_state", "inactive")
    }

}

/**
 *
 * @returns {Promise<void>}
 */
async function refreshBrowser() {
    await startBrowser();
    await startUp();

}

/**
 *
 * @returns {Promise<void>}
 */
async function resetBrowser() {
    LOG.log("Resetting browser and start new session");
    await closeBrowser();
    await refreshBrowser();
}

/**
 *
 * @param code
 * @returns {Promise<void>}
 */
async function verify(code) {
    await takeScreenshot("verify");
    await page.type('text/Code', code, {delay: 50 + Math.random() * 100});
    await page.click('text/Continue');
}

// 📌 Check if page is still alive
function isPageOk() {
    return browser && browser.isConnected() && page && !page.isClosed();
}

function getVariables(type){
    return graphqlData[type].postData.variables;
}


/**
 *
 * @param name
 * @returns {Promise<void>}
 */
async function takeScreenshot(name){
    if (!page.isClosed()) {
        await page.screenshot({path: `screens/${name}.png`, fullPage: true});
    }
}

/**
 *
 * @param exitCode
 * @returns {Promise<void>}
 */
const cleanup = async (exitCode = 0) => {
    try {
        if (browser && browser.isConnected()) {
            LOG.debug('Cleaning tmp');

            fs.readdirSync(tmpDir).forEach(file => {
                const filePath = path.join(tmpDir, file);
                try {
                    fs.rmSync(filePath, { recursive: true, force: true });
                    LOG.log(`Deleted: ${filePath}`);
                } catch (err) {
                    LOG.error(`Error deleting ${filePath}:`, err.message);
                }
            });

            if(Object.keys(graphqlData).length > 0)
                await saveGraphqlData(graphqlData);

            await closeBrowser();
        }
    } catch (err) {
        LOG.error('Error closing browser:', err);
    } finally {
        process.exit(exitCode);
    }
};

eventEmitter.on("request_update", async (res) => {

    switch (res.request_name){
        case "PolarisSearchBoxRefetchableQuery":
            LOG.log("Search profile api");
            break;
        case "PolarisProfilePageContentQuery":
            LOG.log("Profile detail api");
            break;
        case "PolarisProfilePostsQuery":
            LOG.log("Profile posts api");
            break;
        case "PolarisStoriesV3ReelPageStandaloneQuery":
            LOG.log("Stories api");
            break;
        case "PolarisProfileStoryHighlightsTrayContentQuery":
            LOG.log("Highlight preview api");
            break;
        case "PolarisProfileReelsTabContentQuery":
            LOG.log("Reels api");
            break;
        case "PolarisStoriesV3HighlightsPageQuery":
            LOG.log("Highlight api");
            try {
                LOG.log('Response finished');
                await waitForTimeout()
                await cleanup();
            } catch (err) {
                LOG.error('Response failed:', err.message);
            }

            break;
        default:

            break;
    }
});



eventEmitter.on("logged_in", loggedIn);
eventEmitter.on('login', login);

eventEmitter.on('refresh', refreshBrowser);
eventEmitter.on('reset', resetBrowser);
eventEmitter.on('logout', logout);

eventEmitter.on('save_info', async (response) => {
    try {
        await page.waitForSelector('text/Save info');
        await page.click('text/Save info');
        LOG.log("Remembered session")

    } catch (e) { /* ignored if modal not found */
        LOG.info("Onetap ", e.message)
    }
});


module.exports = {
    verify,
    graphqlData,
    getVariables,
    cleanup,

};
