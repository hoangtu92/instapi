const axios = require("axios");
const {USER_AGENT} = require("../constants/browser.constant");
const sessionService = require("../services/session.service")
const LOG = require("../helpers/log");
const Helper = require("../helpers/helpers");

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
            "Content-Type": "application/x-www-form-urlencoded",
            "referer": "https://www.instagram.com/",
            "origin": "https://www.instagram.com/",
        };

        const tokenHeaders = {
            "x-csrftoken": params["x-csrftoken"],
            'x-ig-app-id': params["x-ig-app-id"]
        }

        /* ---- Inject headers ---- */
        config.headers = {
            ...paramHeaders,
            ...config.headers,
            ...tokenHeaders,
            cookie,
        };

        /* ---- Inject proxy ---- */
        if (acc.proxy_host) {
            const agent = Helper.getHttpAgent(acc);

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
            if (meta.retryCount === 0 && [401, 403, 407].includes(status)) {
                meta.retryCount++;

                delete config.headers.cookie;
                delete config.headers["x-csrftoken"];
                delete config.headers["x-ig-app-id"];

                return instance(config);
            }
            else{
                await sessionService.errorHandler( error);
            }

        }

        return Promise.reject(error);
    }
);



module.exports = instance
