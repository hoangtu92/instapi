const browserService = require("./src/services/browser.service");
const Config = require("./src/services/config.service");
const readline = require("readline");
const fs = require("fs");

const args = process.argv.slice(2);
const FILE = "./storages/accounts.json";

// 4. readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const params = {};
args.forEach(arg => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    params[key] = value ?? true;
});

console.log("Headless", !params.show);

function ask(question, defaultValue = null) {
    return new Promise((resolve) => {
        const q = defaultValue
            ? `${question} (${defaultValue}): `
            : `${question}: `;

        rl.question(q, (answer) => {
            if (answer.trim() === "" && defaultValue !== null) {
                resolve(defaultValue);
            } else {
                resolve(answer.trim());
            }
        });
    });
}



async function askConfig() {
    const config = {};

    config.proxy_host = await ask(
        "Proxy hostname",
        "v2.proxyempire.io"
    );

    config.proxy_port = await ask(
        "Proxy port",
        "5000"
    );

    config.proxy_username = await ask("Proxy username");
    config.proxy_pass = await ask("Proxy password");

    config.ig_username = await ask("Instagram username");
    config.ig_password = await ask("Instagram password");


    let accounts = Config.readJson(FILE);
    accounts.push(config);

    Config.saveJson(FILE, accounts);

    return config;
}

// ===== FILE WATCH =====
function watchConfigFile() {
    fs.watch(FILE, (eventType) => {
        if (eventType === "change") {
            console.clear();
            console.log("⚠️ config changed");
            showMenu();
        }
    });
}

function showMenu(){
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
    console.log("Press 0 to add account\n");

    rl.question("\nEnter number: ", async (answer) => {
        const index = Number(answer) - 1;

        if(Number.isNaN(index)){
            console.log("Invalid choice");
            rl.close();
            process.exit(1);
        }

        let selected;

        if (index === -1) {
            process.stdin.setRawMode(false);
            selected = await askConfig();
        }
        else{
            if (!accounts[index]) {
                console.log("No account selected");
                rl.close();
                process.exit(1);
            }

            selected = accounts[index];
        }


        console.log("\nSelected account:");
        console.log(selected.ig_username);

        rl.close();

        // 👉 continue your logic here
        // use `selected`
        const account = Config.getConfig(selected.ig_username);
        await browserService.login({config: account, headless: !params.show});
        //rl.close();
    });

}


showMenu();
watchConfigFile();
