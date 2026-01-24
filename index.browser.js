const browserService = require("./src/services/browser.service");
const Config = require("./src/services/config.service");
const readline = require("readline");
const fs = require("fs");

const args = process.argv.slice(2);

const params = {};
args.forEach(arg => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    params[key] = value ?? true;
});

console.log("Headless", !params.show)

const FILE = "./storages/accounts.json";

// 1. read & parse JSON
let accounts;
try {
    const raw = fs.readFileSync(FILE, "utf8");
    accounts = JSON.parse(raw);
} catch (err) {
    console.error("Failed to read accounts.json:", err.message);
    process.exit(1);
}

// 2. validate
if (!Array.isArray(accounts) || accounts.length === 0) {
    console.error("No accounts found");
    process.exit(1);
}

// 3. show list
console.log("\nChoose an account:\n");
accounts.forEach((acc, i) => {
    console.log(`${i + 1}. ${acc.ig_username}`);
});

// 4. readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("\nEnter number: ", async (answer) => {
    const index = Number(answer) - 1;

    if (Number.isNaN(index) || !accounts[index]) {
        console.log("Invalid choice");
        rl.close();
        process.exit(1);
    }

    const selected = accounts[index];

    console.log("\nSelected account:");
    console.log(selected.ig_username);

    rl.close();

    // 👉 continue your logic here
    // use `selected`
    const account = Config.getConfig(selected.ig_username);
    await browserService.login({config: account, headless: !params.show})
});

