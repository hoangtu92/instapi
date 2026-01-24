const {issueDetectionHelper} = require("../helpers/issue.detection.helper");
const { LOGIN_REQUIRED, VERIFICATION, CONSENT, CHALLENGE, SESSION_ISSUE} = require("../constants/sessionIssue.constants");
const {handleConsent} = require("../helpers/consent.helper");
const {submitInfoAction} = require("../helpers/login.helper");

function attachOnLoadPageEvent(page, config, headless){

    page.on("framenavigated", async () => {
        //await handleConsent(page);
    });

    page.on("requestfinished", async () => {
        //await handleConsent(page);
    });

    page.on("load", async () => {

        const issue = await issueDetectionHelper(page);

        //await handleConsent(page);

        switch (issue) {
            case LOGIN_REQUIRED:
                // Login process
                await submitInfoAction(page, config);
                break;
            case VERIFICATION:
            case CONSENT:
            case CHALLENGE:

                if(headless){
                    throw Object.assign(new Error(SESSION_ISSUE), { issue });
                }
                break;
        }

    });
}

module.exports = {attachOnLoadPageEvent}
