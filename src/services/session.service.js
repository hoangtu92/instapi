const ParamsService = require("./params.service");
const CookieService = require("./cookie.service");
const ConfigService = require("./config.service");
const Redis = require("../infra/redis");
const LOG = require("../helpers/log");
const axiosBootstrap = require("../clients/axios.bootstrap");

const CURRENT_SESSION_KEY = "instapi:current_session"

class SessionService {
    async ensureValidSession (){

        try{
            const cached = await Redis.get(CURRENT_SESSION_KEY);
            if(cached) return JSON.parse(cached);
        }
        catch (e) {}


        const config = await ConfigService.getCurrentConfig();


        if(!config){
            throw new Error("No active config available");
        }


        const ig_username = config.ig_username;

        const params = ParamsService.get(ig_username);
        const cookies = CookieService.get(ig_username);

        if(!params){
            throw new Error("No params available");
        }

        if(!cookies){
            throw new Error("No cookie available");
        }

        const session = {
            params,
            cookie: CookieService.serialize(cookies),
            config
        }



        await Redis.set(CURRENT_SESSION_KEY, JSON.stringify(session));

        return session;

    }

    async handleUnauthorized({ig_username, status}){

        // Delete current session.
        await Redis.del(CURRENT_SESSION_KEY);

        let config = await ConfigService.getRandomAccount();

        if(config && config.ig_username !== ig_username){


            if(CookieService.available(config.ig_username) && ParamsService.available(config.ig_username)){
                // switch to new random account when cookie and params are found
                await ConfigService.setCurrentConfig(config);
                return true;
            }

        }

        // same account rebuild params once
        return await this.rebuild(config);

    }

    /**
     * Lightweight rebuild (Axios only)
     */
    async rebuild(config) {

        if(!config){
            throw new Error("No active config available");
        }

        LOG.debug("Rebuilding ", config.ig_username);

        let cookies = CookieService.get(config.ig_username);

        if (!cookies) {
            throw new Error("No active cookie available");
        }

        try {
            const html = await axiosBootstrap.get("https://www.instagram.com", {
                headers: {
                    cookie: CookieService.serialize(cookies)
                },
                acc: config,
            }).then(res => res.data);

            const csrftoken = html.match(/"csrf_token"\s*:\s*"([^"]+)"/)[1];

            const params =  {
                "x-csrftoken": csrftoken
            };
            ParamsService.save(config.ig_username, params);

            cookies.find(e => e.name === "csrftoken" ).value = csrftoken;

            CookieService.save(config.ig_username, cookies);

            return true;

        } catch (e) {
            LOG.warn("Light rebuild failed:", e.message);
            return null;
        }
    }
}

module.exports = new SessionService();
