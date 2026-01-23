const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require("path");
const os = require("os");
const Config = require("./config");
const Redis = require("./redis");
const eventEmitter = require("./eventEmitter");
const sendMail = require("./alertSystem");
const Helper = require("./helpers");
const LOG = require("./log");
const { spawn } = require("child_process");


require('dotenv').config();

const tmpDir = "/tmp";
const homeDir = os.homedir();
let queryStack = [];
let detach = null;


puppeteer.use(StealthPlugin());

let browser = null;
let page = null;
let graphqlData = Config.getGraphqlData();

const isProduction = process.env.NODE_ENV === "production";
if (process.env.NODE_ENV === "production") {
    LOG.log("Running in production mode");
}


/**
 *
 * @param page
 * @returns {(function(): void)|*}
 */
function attachPageEvents(page) {

    let action = 'init', previous_action = 'init';

    /**
     *
     * @param request
     * @returns {Promise<void>}
     */
    const onRequestFinished = async (request) => {
        try{
            const type = request.resourceType();
            const response = request.response();
            if(!request.url().includes("https://www.instagram.com")) return;

            let status = response.status();
            if(status < 200 || status > 300) return;

            if(type === "document"){
                if (request.url().includes("codeentry")) {
                    action = "verify_notify"
                }
                else if (request.url().includes("challenge")) {
                    action = "challenge"
                }
                else if (request.url().includes('/accounts/login')) {
                    action = "login"
                }
                else if (request.url().includes("onetap")) {
                    action = "save_info"
                }
                else if (request.url().includes("consent")) {
                    action = "consent"
                }
            }
            else if (request.method() === 'POST' && request.url().includes('/graphql/query')) {
                action = "logged_in"
            }

            if(action !== previous_action){

                LOG.log(status, type, request.url());
                LOG.info("State change from", previous_action, "to", action);

                eventEmitter.emit(action, request);
                previous_action = action;
            }
        }
        catch (e) {
            LOG.error(e.message)
        }
    }
    page.on("requestfinished", onRequestFinished);

    return () => {
        page.off("requestfinished", onRequestFinished);
    };
}


/**
 *
 * @returns {Promise<void>}
 */
async function startBrowser() {

    let config = await Config.getCurrentConfig();
    await Redis.set("browser:state", "active")

    try{

        if(!browser){
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
        }

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

    await Helper.loadCookies(page);

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
        await cleanup();
    }
}


/**
 *
 * @returns {Promise<void>}
 */
async function signUp(idx){
    try{
        await startBrowser();
        LOG.info("Try to signup ")
        await page.goto("https://www.instagram.com/accounts/emailsignup/?next=", {waitUntil: "networkidle2"});

        let accounts = Config.readJson(path.resolve(process.cwd(), "accounts.json"));

        if(accounts[idx]){
            const newAccount = accounts[idx];
            LOG.info("Login process", newAccount.ig_username);

            await Helper.byPassCookieConsent(page);

            await Helper.waitForTimeout();

            await page.waitForSelector('input[type="text"]', {visible: true});

            await page.type('input[type="text"]', newAccount.ig_username, {delay: 50 + Math.random() * 100});
            await page.type('input[type="password"]', newAccount.ig_password, {delay: 50 + Math.random() * 100});

        }

    }
    catch(e){
        LOG.error(e.message);
        await cleanup();
    }
}



/**
 *
 * @param response
 * @returns {Promise<void>}
 */
async function login(response) {

    try{
        let config = await Config.getCurrentConfig();

        LOG.info("Login process", config.ig_username);

        await Helper.byPassCookieConsent(page);

        await Helper.waitForTimeout();

        await page.waitForSelector('input[type="text"]', {visible: true});

        await page.type('input[type="text"]', config.ig_username, {delay: 50 + Math.random() * 100});
        await page.type('input[type="password"]', config.ig_password, {delay: 50 + Math.random() * 100});

        await page.waitForSelector('text/Log in', {visible: true});
        await page.click('text/Log in');
        LOG.info("Submitting login information");

        await Helper.waitForTimeout();

        await Helper.byPassCookieConsent(page);

    }
    catch (e) {
        LOG.error(e.message);
        await Helper.takeScreenshot(page, "login-error");
    }
}


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
        await Redis.set("browser:state", "inactive")
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

            eventEmitter.emit("cleanup:finished")

            await closeBrowser();
        }
    } catch (err) {
        LOG.error('Error closing browser:', err);
    } finally {
        process.exit(exitCode);
    }
};

eventEmitter.on("cleanup:finished", async () => {
    if(Object.keys(graphqlData).length > 0)
        Config.saveGraphqlData(graphqlData);
})

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
                await Helper.waitForTimeout()
                await cleanup();
            } catch (err) {
                LOG.error('Response failed:', err.message);
            }
            break;
        default:

            break;
    }
});




eventEmitter.on("logged_in", async (request) =>{

    try{

        const postData = await request.fetchPostData();
        const postDataObj = new URLSearchParams(postData);
        const response = request.response();


        const request_name = postDataObj.get("fb_api_req_friendly_name");

        let obj = Object.fromEntries(postDataObj);

        if(obj.variables)
            obj.variables = JSON.parse(obj.variables);

        let headers = request.headers()
        headers = Helper.convertHeaders(headers);

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

        await Helper.saveCookies(page);

        await Helper.waitForTimeout();

        await Helper.triggerSearchQuery(page);

        await Helper.triggerProfileQuery(page);

        await Helper.triggerReelQuery(page);

        await Helper.triggerStoryQuery(page);

        await Helper.triggerHighLightQuery(page);

    }
    catch (e){
        LOG.error(e.message)
    }

});

eventEmitter.on("signup", signUp);

eventEmitter.on('login', login);

eventEmitter.on('browser:refresh', async () => {
    await refreshBrowser();
});
eventEmitter.on('reset', resetBrowser);

eventEmitter.on('logout', async () => {
    await Helper.clearCookies(page);
    await cleanup();
});

eventEmitter.on('save_info', async () => {
    try {
        await page.waitForSelector('text/Save info');
        await page.click('text/Save info');
        LOG.log("Remembered session")

    } catch (e) { /* ignored if modal not found */
        LOG.info("Onetap ", e.message)
    }
});


eventEmitter.on('consent', async () => {
    LOG.debug("Sending email")
    //todo send email
    //await sendMail("Instagram API alert", "An instagram account has been inactive and requires consent in order to continue to serve");

    let config = await Config.setRandomAccount();
    process.exit(0);

});
eventEmitter.on('challenge', async () => {
    //todo send email
    //await sendMail("Instagram API alert", "An instagram account has been inactive and requires to complete challenge in order to continue to serve");

    await Config.setRandomAccount();
    process.exit(0);
});


eventEmitter.on("verify", async (code) => {
    if(page && !page.isClosed()){
        await Helper.takeScreenshot(page, "verify");
        await page.type('text/Code', code, {delay: 50 + Math.random() * 100});
        await page.click('text/Continue');
    }

});


module.exports = {graphqlData, refreshBrowser};
