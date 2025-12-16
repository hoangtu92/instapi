const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require("path");
const cookiesPath = path.resolve("./instagram-cookies.json");

require('dotenv').config();

puppeteer.use(StealthPlugin());

let browser = null;
let page = null;
let graphqlData = [];

const IG_USERNAME = String(process.env.IG_USERNAME || "");
const IG_PASSWORD = String(process.env.IG_PASSWORD || "");
const PROXY_HOST = String(process.env.PROXY_HOST || "");
const PROXY_PORT = String(process.env.PROXY_PORT || "");
const PROXY_USER = String(process.env.PROXY_USER || "");
const PROXY_PASS = String(process.env.PROXY_PASS || "");

const ProxyStr = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;

const isProduction = process.env.NODE_ENV === "production";

/**
 *
 * @param filename
 * @returns {Promise<null|any>}
 */
async function readJson(filename) {
    try {
        const data = await fs.promises.readFile(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Failed to read JSON:', err.message);
        return null;
    }
}

if (process.env.NODE_ENV === "production") {
    console.log("Running in production mode");
}

/**
 *
 * @returns {Promise<void>}
 */
async function saveCookies() {
    if (!page) return;
    const cookies = await page.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log("✅ Cookies saved");
}

/**
 *
 * @returns {Promise<{browser: null, page: null}>}
 */
async function startBrowser() {

    if (browser && browser.isConnected() && page && !page.isClosed()) return {browser, page};

    // Launch Puppeteer browser
    else if (!browser || !browser.isConnected()) {
        console.log("Launching Puppeteer...");

        let options = {
            headless: isProduction, // set to true for production
            args: ["--no-sandbox", "--disable-setuid-sandbox", `--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`],
            defaultViewport: null,
        };

        if(isProduction){
            options.executablePath = '/usr/bin/google-chrome-stable';
            options.userDataDir = path.join(__dirname, 'chrome-profile');
        }

        // Launch Puppeteer browser
        browser = await puppeteer.launch(options);
    }

    page = (await browser.pages())[0];



    // Optional: set a default user-agent and viewport
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // authenticate proxy
    await page.authenticate({
        username: PROXY_USER,
        password: PROXY_PASS
    });

    // Load cookies from previous session (if available)
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath));
        await page.setCookie(...cookies);
        console.log("✅ Cookies loaded");
    }

    graphqlData["data"] = await readJson("params.json");

    page.on('response', async (res) => {

        if (page.isClosed()) return;

        let status = res.status();

        if (res.url().includes("codeentry")) {
            if(status >= 200 && status < 300){
                console.error("Need verify code. check email and send code to /verify?code=xxx");
                //todo send email
            }
            else{
                await resetBrowser();
            }

        }
        if (res.url().includes("onetap")) {
            if(status >= 200 && status < 300){
                try {
                    await page.waitForSelector('text/Save info');
                    await page.click('text/Save info');
                    console.log("✅ Remembered session")

                } catch (e) { /* ignored if modal not found */
                    console.info("Onetap ", e.message)
                }
            }
            else{
                await resetBrowser();
            }

        }
    });

    await login(page);

}

/**
 *
 * @returns {null|*}
 */
function getCookieHeader() {
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath));

        return cookies
            .map(c => `${c.name}=${c.value}`)
            .join("; ");
    }
    return null;
}
/**
 *
 * @returns {Promise<void>}
 */
async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
}

/**
 * Clear cookies
 * @returns {Promise<void>}
 */
async function clearCookies(){
    const cookies = await page.cookies();
    await page.deleteCookie(...cookies);
}

/**
 *
 * @returns {Promise<void>}
 */
async function resetBrowser() {
    console.log("Resetting browser and start new session");
    await closeBrowser();
    await startBrowser();
}


/**
 *
 * @param page
 * @returns {Promise<void>}
 */
async function login(page) {

    try {
        await page.goto("https://www.instagram.com/accounts/login/", {waitUntil: "domcontentloaded"});
        console.log("✅ Page Loaded:", page.url());

        if (page.url().includes("/accounts/login")) {
            await page.screenshot({path: 'screens/login.png', fullPage: true});
            await page.waitForSelector('input[type="text"]', {visible: true});

            await page.type('input[type="text"]', IG_USERNAME, {delay: 50 + Math.random() * 100});
            await page.type('input[type="password"]', IG_PASSWORD, {delay: 50 + Math.random() * 100});

            await page.waitForSelector('text/Log in', {visible: true});
            await page.click('text/Log in');
            console.log("✅ Submitting login information");
        }

    } catch (e) {
        console.error("LOAD FAILED:", e.message);
        //await page.screenshot({path: 'failed.png', fullPage: true});
        await resetBrowser();
        return;
    }

    await page.setRequestInterception(true);

    graphqlData["data"] = await readJson("params.json");

    let ready = false;

    page.on('request', async (req) => {
        if (req.method() === 'POST' && req.url().includes('/graphql/query')) {
            const postData = req.postData();

            if(!ready) {
                await saveCookies();
                console.log("✅ Ready to serve");
                ready = true;
            }

            graphqlData["request"] = {
                url: req.url(),
                method: req.method(),
                headers: req.headers(),
                originalPostData: postData
            };

        }

        req.continue();
    });

}

/**
 *
 * @param code
 * @returns {Promise<void>}
 */
async function verify(code) {
    await page.type('text/Code', code, {delay: 50 + Math.random() * 100});
    await page.click('text/Continue');
    await page.screenshot({path: 'screens/verify.png', fullPage: true});
}

/**
 *
 * @param type
 * @returns {null|{[p: string]: any}}
 */
function copyDataFromSample(type = "posts"){

    if(typeof graphqlData["data"][type] == "undefined") return null;

    let sample = graphqlData["data"][type];

    const params = new URLSearchParams(graphqlData["request"].originalPostData);
    const obj = Object.fromEntries(params);

    obj.doc_id = sample.doc_id;
    obj.fb_api_req_friendly_name = sample.fb_api_req_friendly_name;
    obj.variables = sample.variables;

    return obj;
}

/**
 *
 * @param saved
 * @param obj
 * @returns {Promise<*>}
 */
async function replayRequest(saved, obj) {

    obj.__req = (parseInt(obj.__req, 16) + 1).toString(16);
    obj.variables = JSON.stringify(obj.variables);
    let query = new URLSearchParams(obj).toString();

    return await page.evaluate(async (saved, query) => {
        return fetch(saved.url, {
            method: saved.method,
            headers: saved.headers,
            body: query
        }).then(r => r.json());
    }, saved, query);
}


// 📌 Check if page is still alive
function isPageOk() {
    return browser && browser.isConnected() && page && !page.isClosed();
}



module.exports = {
    verify,
    startBrowser,
    isPageOk,
    resetBrowser,
    clearCookies,
    getCookieHeader,
    page,
    ProxyStr,
    graphqlData,
    copyDataFromSample
};
