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



module.exports = LOG
