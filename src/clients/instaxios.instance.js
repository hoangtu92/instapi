const axios = require("axios");
const {HttpsProxyAgent} = require("https-proxy-agent");
const {USER_AGENT} = require("../constants/browser.constant");
const sessionService = require("../services/session.service")
const LOG = require("../helpers/log");

const instance = axios.create({
    timeout: 30000,
    validateStatus: (status) => {
        return status >= 200 && status < 300
    },
    headers : {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9"
    },
});

/**
 * REQUEST INTERCEPTOR
 * Inject params + proxy
 */
instance.interceptors.request.use(
    async (config) => {

        const session = await sessionService.ensureValidSession();
        if (!session) {
            throw new Error("No active session available");
        }


        const { cookie, params, config: acc } = session;



        // Params → headers
        const paramHeaders =  {
            "x-csrftoken": params["x-csrftoken"], // Use header from puppeteer first, fallback to axios bootstrap value
            "Content-Type": "application/x-www-form-urlencoded",
            "referer": "https://www.instagram.com/",
            "origin": "https://www.instagram.com/",
        };

        /* ---- Inject headers ---- */
        config.headers = {
            ...paramHeaders,
            ...config.headers,
            cookie,
        };

        /* ---- Inject proxy ---- */
        if (acc.proxy_host) {
            const agent = new HttpsProxyAgent(`http://${acc.proxy_username}:${acc.proxy_pass}@${acc.proxy_host}:${acc.proxy_port}`);

            config.httpsAgent = agent;
            config.httpAgent = agent;

            config.proxy = false; // IMPORTANT for axios
        }

        /* ---- Meta for unauthorized handler ---- */
        config.meta ??= {};

        config.meta.ig_username= acc?.ig_username;
        config.meta.retryCount ??= 0;

        return config;
    },
    Promise.reject
);

instance.interceptors.response.use(
    async response => response,
    async (error) => {



        if(error.config && error.response){

            const config = error.config;
            const response = error.response;
            const meta = config?.meta || {};

            const status = response.status;
            /**
             * 🚫 COOKIE FAILURE → NO RETRY
             */
            if([401, 403].includes(status)){

                if (config.meta.retryCount === 0) {
                    config.meta.retryCount++;

                    try{
                        await sessionService.handleUnauthorized( {ig_username: meta.ig_username, status});

                        delete config.headers.cookie;
                        delete config.headers["x-csrftoken"];

                        return instance(config);

                    }
                    catch (e) {
                        LOG.error("Rebuild failed.");
                    }
                }
            }

        }

        return Promise.reject(error);
    }
);



module.exports = instance
