const fs = require("fs");
const path = require("path");

/**
 *
 * @returns {{password: *, port: number, host: *, username: *}}
 */
function getRandomProxy() {
    const content = fs.readFileSync(path.resolve("./proxies.info"), "utf8");

    // Split and remove empty line
    const lines = content
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    if (!lines.length) {
        throw new Error("No proxies found");
    }

    // random 1 line
    const line = lines[Math.floor(Math.random() * lines.length)];

    const [host, port, username, password] = line.split(":");

    if (!host || !port || !username || !password) {
        throw new Error(`Invalid proxy format: ${line}`);
    }

    return {
        host,
        port: Number(port),
        username,
        password
    };
}




module.exports = {getRandomProxy}
