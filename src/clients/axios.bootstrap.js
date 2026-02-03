const axios = require("axios");
const {HttpsProxyAgent} = require("https-proxy-agent");
const {USER_AGENT} = require("../constants/browser.constant");
const Helper = require("../helpers/helpers");

const instance = axios.create({
    timeout: 15000,
    validateStatus: (status) => {
        return status >= 200 && status < 300
    },
    headers : {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest"
    },
});

/**
 * REQUEST INTERCEPTOR
 * Inject params + proxy
 */
instance.interceptors.request.use(
    async (config) => {

        const acc = config.acc;

        if(!acc){
            throw new Error("No config available");
        }

        /* ---- Inject proxy ---- */
        if (acc.proxy_host) {
            const agent = Helper.getHttpAgent(acc);


            config.httpsAgent = agent;
            config.httpAgent = agent;

            config.proxy = false; // IMPORTANT for axios
        }

        config.meta ??= {};

        config.meta.ig_username= acc?.ig_username;

        return config;
    },
    Promise.reject
);

module.exports = instance
