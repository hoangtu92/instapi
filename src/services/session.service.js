const ParamsService = require("./params.service");
const CookieService = require("./cookie.service");
const ConfigService = require("./config.service");
const Redis = require("../infra/redis");
const LOG = require("../helpers/log");
const axiosBootstrap = require("../clients/axios.bootstrap");

const CURRENT_SESSION_KEY = "instapi:current_session"

class SessionService {
    async ensureValidSession (){


        const session = await this.getRandomSession();

        if(!session){
            throw new Error("No config available");
        }


        if(!session.params){
            throw new Error("No params available");
        }

        if(!session.cookie){
            throw new Error("No cookie available");
        }

        LOG.debug("Session: ", session.config.ig_username)

        return session;

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
            // No cookies, alert admin
            throw new Error("No active cookie available");
        }

        try {
            const html = await axiosBootstrap.get("https://www.instagram.com", {
                headers: {
                    cookie: CookieService.serialize(cookies)
                },
                acc: config,
            }).then(res => res.data);

            const m = html.match(/"csrf_token"\s*:\s*"([^"]+)"/);

            if(!m[1]){
                // IG Session expired, need full login process.
            }
            const csrftoken = m[1];

            let params =  {
                "x-csrftoken": csrftoken
            };

            const m1 = html.match(/"app_id"\s*:\s*"([^"]+)"/);
            if(m1[1]){
                params["x-ig-app-id"] = m1[1];
            }

            ParamsService.save(config.ig_username, params);

            cookies.find(e => e.name === "csrftoken" ).value = csrftoken;

            CookieService.save(config.ig_username, cookies);

            return true;

        } catch (e) {
            LOG.warn("Light rebuild failed:", e.message);
            return null;
        }
    }

    /**
     *
     * @returns {Promise<string|Buffer<ArrayBufferLike>>}
     */
    async getSessions() {
        try {
            let sessions = await Redis.get(CURRENT_SESSION_KEY);
            if(sessions) return JSON.parse(sessions);
        }
        catch (e) {
            LOG.error("Invalid config in Redis, reloading from file");
        }

        try{
            const accounts = await ConfigService.getConfigs();
            const candidates = accounts.filter(
                acc => ParamsService.available(acc.ig_username)
                    && CookieService.available(acc.ig_username)

            );
            if(candidates.length){

                return candidates.map(config => {
                    const ig_username = config.ig_username;

                    const params = ParamsService.get(ig_username);
                    const cookies = CookieService.get(ig_username);

                    return {
                        params,
                        cookie: CookieService.serialize(cookies),
                        config
                    }
                })
            }

        }
        catch (e) {
            LOG.error("Config error", e.message)
        }

        return null;
    }


    /**
     *
     * @returns {Promise<boolean|*>}
     */
    async getRandomSession(ig_username = null) {

        let sessions = await this.getSessions();

        if(sessions){
            if(ig_username){
                sessions = sessions.filter(e => e.config.ig_username !== ig_username);
            }
            const index = Math.floor(Math.random() * sessions.length);
            return sessions[index]
        }

        return null;
    }

    /**
     *
     * @param err
     * @returns {Promise<void>}
     */
    async errorHandler (err) {
        LOG.error("Error: ", err.message);
        await Redis.del(CURRENT_SESSION_KEY);

        process.exit(0);
    }
}

module.exports = new SessionService();
