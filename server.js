const express = require("express");
const cors = require("cors");
const app = express();
const LOG = require("./src/log");
const Config = require("./src/config");
const fs = require("fs");

require('dotenv').config();

const {getProfile, searchProfile, getPosts, getStories, getHighLightsPreview, getHighLights, getMediaInfo, getReels
} = require("./src/instagramController");
const {google} = require("googleapis");



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

    const creds = JSON.parse(fs.readFileSync('credentials.json'));
    const auth = new google.auth.OAuth2(
        creds.web.client_id,
        creds.web.client_secret,
        "https://cdn-api.privateig.com/gmail_postback"
    );

    const { tokens } = await auth.getToken(req.query.code);
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token saved to token.json');
    res.status(200);

});


// 🖥 Start server
const PORT = 3001;
app.listen(PORT, async () => {
    LOG.log(`API server running on port ${PORT}`);

    const config = await Config.getCurrentConfig();
    LOG.log("Current account", config.ig_username);
});
