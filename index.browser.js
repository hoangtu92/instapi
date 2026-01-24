const browserService = require("./src/services/browser.service");
const Config = require("./src/services/config.service");
const LOG = require("./src/helpers/log");

const args = process.argv.slice(2);

const params = {};
args.forEach(arg => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    params[key] = value ?? true;
});

if(!params.username){
    LOG.error("missing --username=<instagram_username>")
    process.exit(0);
}


(async ()=>{
    const account = Config.getConfig(params.username);
    await browserService.login({config: account, headless: !params.show})

})();
