const express = require("express");
const cors = require("cors");
const app = express();
const {LOG} = require("./src/helpers");
const {eventEmitter} = require("./src/eventEmitter");
const {Redis, getCurrentConfig, setRandomAccount} = require("./src/redis");
const WebSocket = require("ws");
require('dotenv').config();

const {getProfile, searchProfile, getPosts, getStories, getHighLightsPreview, getHighLights, getMediaInfo, verifyCode, getReels
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

/**
 * Verify instagram code
 */
app.get("/verify", verifyCode);

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
        LOG.log("Received:", msg.toString());
        let state;
        switch (msg) {
            case "refresh_session":
                state = await Redis.get("browser_state");
                if(state !== "active") {
                    eventEmitter.emit("refresh", null)
                }
                break;
            case "change_account":
                state = await Redis.get("browser_state");
                if(state !== "active") {
                    let config = await setRandomAccount();
                    eventEmitter.emit("refresh", config)
                }
                break;
        }

        // echo back
        ws.send(`Server got: ${msg}`);
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
    await Redis.set("browser_state", "inactive");
    const config = await getCurrentConfig();
    LOG.log("Current account", config.ig_username);
});
