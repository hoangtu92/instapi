/**
 * Accept cookie consent if shown
 */
const LOG = require("../../helpers/log");

async function handleConsent(page) {
    try {
        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const acceptBtn = buttons.find(btn =>
                /accept|allow|agree|dismiss|save\sinfo|ok/i.test(btn.innerText)
            );
            if (acceptBtn) {
                acceptBtn.click();
                return true;
            }
            return false;
        });

        if (clicked) {
            LOG.info("[browser] consent dismissed");
        }

        return clicked;
    } catch {
        return false;
    }
}


module.exports = {handleConsent}
