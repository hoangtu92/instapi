const fs = require("fs");
const LOG = require("../helpers/log");
const path = require("path");
const crypto = require("crypto");
class ParamsService {
    /**
     *
     * @returns {null|*}
     */
    get (ig_username) {

        try{
            const paramsPath = this.getPath(ig_username);
            return JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
        }
        catch (e) {
            return null;
        }
    }

    /**
     *
     * @param ig_username
     * @param params
     */
    save (ig_username, params) {
        LOG.info("Save Param", ig_username)
        const paramsPath = this.getPath(ig_username);
        fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2));
        LOG.log("Params saved");
    }


    /**
     *
     * @returns {string}
     * @param ig_username
     */
    getPath (ig_username) {
        return path.resolve("storages/params/" + crypto
            .createHash("sha256")
            .update(ig_username)
            .digest("hex") + ".json");
    }

    available(ig_username){
        return fs.existsSync(this.getPath(ig_username));
    }

}


module.exports = new ParamsService();
