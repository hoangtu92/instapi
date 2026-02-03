const express = require("express");
const cors = require("cors");
const app = express();
const LOG = require("./src/helpers/log");
const Config = require("./src/services/config.service");

require('dotenv').config();

const {getProfile, searchProfile, getPosts, getStories, getHighLightsPreview, getHighLights, getMediaInfo, getReels,
    getSimplePosts
} = require("./src/controller/instagramController");
const {postBack} = require("./src/controller/email.controller");



app.use(cors({origin: [
        "https://privateig.com",
        "https://www.privateig.com"
    ]}));
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

app.get("/simple-posts", getSimplePosts);


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

app.get("/gmail_postback", postBack);


// 🖥 Start server
const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, async () => {
    LOG.log(`API server running on port ${PORT}`);
});
