const fs = require("fs");
const path = require("path");
const {LOG} = require("./helpers");
const crypto = require("crypto");
const {getCurrentConfig} = require("./redis");

/**
 *
 * @returns {Promise<void>}
 */
async function saveCookies(page) {
    if (!page) return;
    let config = await getCurrentConfig();
    LOG.info("Save Cookie", config.ig_username)
    const cookiesPath = await getCookiePath(config);
    const cookies = await page.cookies();
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    LOG.log("Cookies saved");
}

/**
 * Clear cookies
 * @returns {Promise<void>}
 */
async function clearCookies(page){
    let config = await getCurrentConfig();
    LOG.info("Clear Cookie", config.ig_username)
    const cookiesPath = await getCookiePath(config);
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
async function getCookieHeader() {
    let config = await getCurrentConfig();
    const cookiesPath = await getCookiePath(config);
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
 * @param page
 * @returns {Promise<void>}
 */
async function loadCookies(page) {
    let config = await getCurrentConfig();
    const cookiesPath = await getCookiePath(config);

    // Load cookies from previous session (if available)
    if (fs.existsSync(cookiesPath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath));
        await page.setCookie(...cookies);
        LOG.log("Cookies loaded", config.ig_username);
    }
}

async function getCookiePath() {
    let config = await getCurrentConfig();
    return path.resolve("cookies/" + crypto
        .createHash("sha256")
        .update(JSON.stringify(config))
        .digest("hex") + ".json");
}

module.exports = {saveCookies, getCookieHeader, clearCookies, loadCookies}
