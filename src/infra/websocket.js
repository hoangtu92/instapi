const WebSocket = require("ws");
const LOG = require("../helpers/log");
const Redis = require("../infra/redis");
const eventEmitter = require("../events/eventEmitter");
const Config = require("../services/config.service");
const sessionService = require("../services/session.service");
const sendMail = require("../services/email.service");

const websocket =  () => {


    let websocketInterval;
    const wss = new WebSocket.Server({port: 8080});

    LOG.log("WebSocket server running on ws://localhost:8080");


    wss.on("connection", async (ws, req) => {

        let config = await Config.getCurrentConfig();

        const params = new URL(req.url, "http://localhost").searchParams;
        const key = params.get("key");

        if (key !== process.env.WS_KEY) {
            ws.close(1008, "Invalid key");
            return;
        }

        //LOG.log("Client connected");

        ws.send(JSON.stringify({
            action: "stats",
            ig_username: config.ig_username,
            proxy_username: config.proxy_username
        }));


        eventEmitter.on('verify_notify', async () => {
            LOG.debug("Need verify code. check email and send code to /verify?code=xxx");
            //todo send email
            //await sendMail("Instagram API alert", "An instagram account has been inactive and requires verification in order to continue to serve");

            if (websocketInterval) clearInterval(websocketInterval);
            websocketInterval = setInterval(() => {
                ws.send(JSON.stringify({
                    action: "verify"
                }))
            }, 5000);

        });

        ws.on("message", async msg => {

            const data = JSON.parse(msg.toString());

            LOG.log("Received:", msg.toString());
            let state = await Redis.get("browser:state");
            switch (data.action) {
                case "verify":
                    eventEmitter.emit("verify", data.code);
                    clearInterval(websocketInterval);

                    break;

                case "trigger_verify":
                    eventEmitter.emit('verify_notify');
                    break;
                case "browser:refresh":
                    if (state !== "active") {
                        eventEmitter.emit("browser:refresh", null)
                    }
                    break;
                case "random_account":
                    if (state !== "active") {
                        let config = await sessionService.setRandomAccount();
                        eventEmitter.emit("browser:refresh", config);
                    }
                    break;

                case "signup":
                    if (state !== "active") {
                        if (data.idx) {
                            eventEmitter.emit("signup", data.idx);
                        }

                    }
                    break;

                case "consent":
                    eventEmitter.emit("consent", null);
                    break;
                case "challenge":
                    eventEmitter.emit("challenge", null);
                    break;
            }


        });

        ws.on("close", () => {
            //LOG.log("Client disconnected");
        });

        ws.on("error", err => {
            LOG.error("WS error:", err);
        });
    });

    return wss;
}




module.exports = websocket;
