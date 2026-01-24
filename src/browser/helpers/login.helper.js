
/**
 *
 * @param page
 * @param config
 * @returns {Promise<*>}
 */
async function submitInfoAction(page, {ig_username, ig_password}) {

    await page.waitForSelector('input[type="text"]', {visible: true});

    await page.type('input[type="text"]', ig_username, {delay: 50 + Math.random() * 100});
    await page.type('input[type="password"]', ig_password, {delay: 50 + Math.random() * 100});

    try{
        await page.waitForSelector('text/Log in', {visible: true});
        await page.click('text/Log in');

    }
    catch (e) {
        await page.waitForSelector('div[role="button"]', {visible: true});
        await page.click('div[role="button"]');
    }


}

module.exports = { submitInfoAction}
