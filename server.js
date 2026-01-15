const express = require("express");
const cors = require("cors");
const app = express();
const LOG = require("./src/log");
const eventEmitter = require("./src/eventEmitter");
const Redis = require("./src/redis");
const Config = require("./src/config");
const WebSocket = require("ws");
const fs = require("fs");

require('dotenv').config();

const {getProfile, searchProfile, getPosts, getStories, getHighLightsPreview, getHighLights, getMediaInfo, getReels
} = require("./src/instagramController");



app.use(cors({origin: "*"}));
app.use(express.json());

app.get("/", async (req, res) => {
    res.status(403).json({ error: "Unauthorized request" });
})

/**
 * Search profile by name
 */
app.get("/search-profile", searchProfile);

/**
 * Get profile data
 */
app.get("/profile", getProfile);

/**
 * Get latest posts
 */
app.get("/posts", getPosts);


/**
 * Get stories
 */
app.get("/stories", getStories);

/**
 * Get latest highlight preview
 */
app.get("/highlights-preview", getHighLightsPreview);

/**
 * Get latest highlight
 */
app.get("/highlights", getHighLights);

/**
 * Get reels
 */
app.get("/reels", getReels);

/**
 * Get media info (highlight)
 */
app.get("/media-info", getMediaInfo);

app.get("/gmail_postback", async (req, res) => {

    if(!req.query.code) return res.status(403);

    const { tokens } = await auth.getToken(req.query.code);
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token saved to token.json');
    res.status(200);

});


const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws, req) => {

    const params = new URL(req.url, "http://localhost").searchParams;
    const key = params.get("key");

    if (key !== process.env.WS_KEY) {
        ws.close(1008, "Invalid key");
        return;
    }

    LOG.log("Client connected");

    ws.on("message", async msg => {

        const data = JSON.parse(msg.toString());

        LOG.log("Received:", msg.toString());
        let state = await Redis.get("browser_state");
        switch (data.action) {
            case "verify":
                eventEmitter.emit("verify", data.code);
                break;
            case "refresh_session":
                if(state !== "active") {
                    eventEmitter.emit("refresh", null)
                }
                break;
            case "random_account":
                if(state !== "active") {
                    let config = await setRandomAccount();
                    eventEmitter.emit("refresh", config);
                }
                break;

            case "switch_account":
                if(state !== "active") {
                    data.idx = data.idx ?? 0;
                    let config = await setAccountByIdx(data.idx);
                    if(config)
                        eventEmitter.emit("refresh", config);
                }
                break;

            case "signup":
                if(state !== "active") {
                    if(data.idx){
                        eventEmitter.emit("signup", data.idx);
                    }

                }
                break;

            case "consent":
                eventEmitter.emit("consent", null);
                break;
            case "verify_notify":
                eventEmitter.emit("verify_notify", null);
                break;
            case "challenge":
                eventEmitter.emit("challenge", null);
                break;
        }

        // echo back
        ws.send(`Server got: ${msg} ${state}`);
    });

    ws.on("close", () => {
        LOG.log("Client disconnected");
    });

    ws.on("error", err => {
        LOG.error("WS error:", err);
    });
});


// 🖥 Start server
const PORT = 3001;
app.listen(PORT, async () => {
    LOG.log(`API server running on port ${PORT}`);
    LOG.log("WebSocket server running on ws://localhost:8080");

    const config = await Config.getCurrentConfig();
    LOG.log("Current account", config.ig_username);
    await Redis.set("browser_state", "inactive");
});
