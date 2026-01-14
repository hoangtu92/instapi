const fs = require("fs");
const path = require("path");
const {LOG} = require("./helpers");
const accountsPath = path.resolve("./accounts.json");
const configPath = path.resolve("./config.json");
const instaParamsPath = path.resolve("./params.json");

let reloadTimer = null;
let config = {};
let loading = false;


/**
 *
 * @param filename
 * @returns {Promise<null|any>}
 */
async function readJson(filename) {
    try {
        const data = await fs.promises.readFile(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        LOG.error('Failed to read JSON:', err.message);
        return null;
    }
}

/**
 *
 * @returns {*}
 */
async function randomAccount() {
    const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
    if (accounts) {
        const index = Math.floor(Math.random() * accounts.length);
        return accounts[index];
    }
    return false

}

/**
 *
 * @param idx
 * @returns {Promise<boolean|*>}
 */
async function getAccount(idx){
    const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
    return accounts[idx] ?? false;
}

/**
 *
 * @returns {Promise<*|null>}
 */
function getGraphqlData(){
    return JSON.parse(fs.readFileSync(instaParamsPath));
}

/**
 *
 * @param graphqlData
 * @returns {Promise<void>}
 */
async function saveGraphqlData(graphqlData){
    return fs.writeFileSync(instaParamsPath, JSON.stringify(graphqlData, null, 2))
}
/**
 *
 */
function loadConfig() {
    if (loading) return;
    loading = true;

    try {
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);   // parse first
        config = parsed;                  // atomic swap
        LOG.info('Config loaded');
    } catch (err) {
        LOG.error('Config load failed:', err.message);
    } finally {
        loading = false;
    }


}

loadConfig();

/**
 *
 * @param data
 */
function saveConfig(data){
    return fs.writeFileSync(configPath, JSON.stringify(data, null, 2))
}

function getConfig(){
    return config;
}

fs.watch(configPath, { persistent: true }, () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
        loadConfig();
    }, 100);
});

module.exports = {getConfig, getGraphqlData, saveGraphqlData, saveConfig, randomAccount, getAccount}
