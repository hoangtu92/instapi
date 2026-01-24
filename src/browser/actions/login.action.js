const {captureGraphqlParams} = require("../observers/request.observer");
const {attachOnLoadPageEvent} = require("../observers/load.observer");
const {SESSION_ISSUE, NAV_TIMEOUT} = require("../constants/sessionIssue.constants");

/**
 *
 * @returns {Promise<object>}
 * @param browser
 */
const loginAction = async ({page, config, headless}) => {
    // Todo full browser bootstrap

    const capturePromise = captureGraphqlParams({page, headless});

    attachOnLoadPageEvent(page, config, headless);

    try{
        await page.goto("https://www.instagram.com/accounts/login/", {waitUntil: "domcontentloaded"});
    }
    catch (err) {
        throw Object.assign(new Error(SESSION_ISSUE), { issue: NAV_TIMEOUT })
    }

    const params = await capturePromise;
    const cookies = await page.cookies()
    return {
        params,
        cookies
    }
}

module.exports = {loginAction}
