class LOG {
    static log(...msg) {
        console.log(`✅  ${msg.join(" ")}`);
    }

    static info(...msg) {
        console.info(`🔵 ${msg.join(" ")}`);
    }

    static warn(...msg) {
        console.warn(`⚠️ ${msg.join(" ")}`);
    }

    static error(...msg) {
        console.error(`❌ ${msg.join(" ")}`);
    }

    static debug(...msg) {
        console.debug(`🐞 ${msg.join(" ")}`);
    }
}



/**
 *
 * @param ttl
 * @returns {Promise<unknown>}
 */
const waitForTimeout = async (ttl = 0) => {
    if(!ttl) ttl = Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000;
    LOG.info(`Waiting for ${ttl/1000} seconds`)
    return await new Promise(r => setTimeout(r, ttl));
}

module.exports = {LOG, waitForTimeout}
