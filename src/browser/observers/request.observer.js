const {extractGraphqlSession} = require("../extractors/captureGraphqlSession");
const {SESSION_ISSUE, GRAPH_TIMEOUT, PARAMS_EXTRACTION_FAILED} = require("../constants/sessionIssue.constants");

/**
 *
 * @returns {Promise<unknown>}
 * @param browser
 */

async function captureGraphqlParams({page, headless}) {
    return new Promise((resolve, reject) => {
        let timeout;

        const onRequest = (req) => {
            try {
                if (req.method() === "POST" && req.url().includes("/graphql/query")) {

                    try{
                        const result = extractGraphqlSession(req);

                        cleanup();
                        resolve(result);
                    }
                    catch (err) {
                        reject(Object.assign(new Error(SESSION_ISSUE), { issue: PARAMS_EXTRACTION_FAILED }));
                    }
                }
            } catch (err) {
                cleanup();
                reject(err);
            }
        };

        const cleanup = () => {
            clearTimeout(timeout);
            page.off("request", onRequest);
        };

        page.on("request", onRequest);

        if(headless){
            // safety timeout
            timeout = setTimeout(() => {
                cleanup();
                reject(Object.assign(new Error(SESSION_ISSUE), { issue: GRAPH_TIMEOUT }));
            }, 60000);
        }

    });
}
module.exports = {captureGraphqlParams}
