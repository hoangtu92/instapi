const express = require("express");
const cors = require("cors");
const app = express();
const {graphql, get_media_info} = require("./src/igGraphql.js");

const {
    verify,
    startBrowser,
    isPageOk,
    resetBrowser,
    clearCookies,
    copyDataFromSample
} = require("./src/browser.js");

app.use(cors({origin: "*"}));
app.use(express.json());

/**
 * Search profile by name
 */
app.get("/search-profile", async (req, res) => {

    const username = req.query.q;
    if (!username) return res.status(400).json({error: "No username provided"});

    try {
        let obj = copyDataFromSample("search");

        obj.variables.data.query = username;
        let response;

        const results = await graphql(obj);

        if(results.data)

            response = Object.values(results.data).pop().users.map(e => ({
                id: e.user.id,
                is_verified: e.user.is_verified,
                username: e.user.username,
                full_name: e.user.full_name,
                profile_pic_url: e.user.profile_pic_url
            }));

        res.json(response);

    } catch (e) {
        res.status(500).json({ error: "IG request failed: " + e.message });
        await resetBrowser();
    }
});

/**
 * Get profile data
 */
app.get("/profile", async (req, res) => {

    const id = req.query.id;
    if (!id) return res.status(400).json({error: "No id provided"});

    try {
        let obj = copyDataFromSample("profile");

        obj.variables.id = id;
        let response;

        const results = await graphql(obj);

        if(results.data){
            let user = results.data.user;

            response = {
                id: user.id,
                bio_links: user.bio_links,
                biography: user.biography,
                category: user.category,
                city_name: user.city_name,
                external_url: user.external_url,
                follower_count: user.follower_count,
                following_count: user.following_count,
                full_name: user.full_name,
                hd_profile_pic_url_info: user.hd_profile_pic_url_info?.url,
                is_business: user.is_business,
                is_professional_account: user.is_professional_account,
                is_verified: user.is_verified,
                latest_reel_media: user.latest_reel_media,
                linked_fb_info: user.linked_fb_info,
                live_broadcast_id: user.live_broadcast_id,
                media_count: user.media_count,
                profile_pic_url: user.profile_pic_url,
                username: user.username,
            }
        }

        res.json(response);

    } catch (e) {
        res.status(500).json({ error: "IG request failed: " + e.message });
        await resetBrowser();
    }
});

/**
 * Verify instagram code
 */
app.get("/verify", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).json({error: "No code provided"});

    if (!isPageOk()) await startBrowser();

    await verify(code);

    res.json(["status", true]);
});

app.get("/reauthenticate", async (req, res) => {

    await clearCookies();
    await resetBrowser();

    res.json(["status", true]);
});


/**
 * Get latest posts
 */
app.get("/posts", async (req, res) => {
    const username = req.query.u;
    if (!username) return res.status(400).json({error: "No username provided"})

    try {
        // Recreate browser/page if closed
        if (!isPageOk()) await startBrowser();

        let response;

        let obj = copyDataFromSample("posts");
        // Adjust variable params according to api
        obj.variables.username = username;

        if(req.query.after) obj.variables.after = req.query.after;
        if(req.query.before) obj.variables.before = req.query.before;
        if(req.query.first) obj.variables.first = req.query.first;
        if(req.query.last) obj.variables.last = req.query.last;

        const results = await graphql(obj);

        if(results.data)
            response = Object.values(results.data).shift().edges.map(e => ({
                caption: e.node.caption?.text,
                id: e.node.id,
                code: e.node.code,
                comment_count: e.node.comment_count,
                like_count: e.node.like_count,
                carousel_media: e.node.carousel_media ? e.node.carousel_media.map(carousel => {
                    return {
                        image_versions2: carousel.image_versions2.candidates,
                        video_versions: carousel.video_versions
                    }
                }): null,
                image_versions2: e.node.image_versions2.candidates,
                video_dash_manifest: e.node.video_dash_manifest,
                video_versions: e.node.video_versions,
                taken_at: e.node.taken_at,
                user: {
                    username: e.node.user.username,
                    full_name: e.node.user.full_name,
                    id: e.node.user.id,
                    profile_pic_url: e.node.user.profile_pic_url
                }
            }));

        res.json({results: response, page_info: results.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info});

    } catch (err) {
        console.error("Search error:", err);
        await resetBrowser();
        res.status(500).json({error: err.message});
    }
});


/**
 * Get stories
 */
app.get("/stories", async (req, res) => {
    const userId = req.query.id;
    if (!userId) return res.status(400).json({error: "No user Id provided"});

    try {
        // Recreate browser/page if closed
        if (!isPageOk()) await startBrowser();

        let response;

        let obj = copyDataFromSample("stories");

        // Adjust variable params according to api
        obj.variables.reel_ids_arr = [userId];
        const results = await graphql(obj);
        if(results.data)
            response = results.data.xdt_api__v1__feed__reels_media.reels_media.map(e => ({
                type: "story",
                title: e.title,
                id: e.id,
                seen: e.seen,
                latest_reel_media: e.latest_reel_media,
                user: e.user,
                reel_type: e.reel_type,
                items: e.items.reduce((t, e) => {
                    t.push({
                        image_versions2: e.image_versions2.candidates,
                        code: e.code,
                        expiring_at: e.expiring_at,
                        pk: e.pk,
                        product_type: e.product_type,
                        video_versions: e.video_versions,
                    })
                    return t;
                }, [])
            }));

        res.json(response);

    } catch (err) {
        console.error("Search error:", err);
        await resetBrowser();
        res.status(500).json({error: err.message});
    }
});

/**
 * Get latest highlight preview
 */
app.get("/highlights-preview", async (req, res) => {
    const userId = req.query.id;
    if (!userId) return res.status(400).json({error: "No user Id provided"});

    try {
        // Recreate browser/page if closed
        if (!isPageOk()) await startBrowser();

        let response;

        let obj = copyDataFromSample("highlights_preview");

        if(req.query.after) obj.variables.after = req.query.after;
        if(req.query.before) obj.variables.before = req.query.before;
        if(req.query.first) obj.variables.first = req.query.first;
        if(req.query.last) obj.variables.last = req.query.last;

        // Adjust variable params according to api
        obj.variables.user_id = userId;
        const results = await graphql(obj);
        if(results.data)
            response = results.data.highlights.edges.map(e => ({
                type: "highlight",
                title: e.node.title,
                id: e.node.id,
                user: e.node.user,
                url: e.node.cover_media.cropped_image_version?.url
            }));

        res.json({
            results: response,
            page_info: results.data.highlights.page_info
        });

    } catch (err) {
        console.error("Search error:", err);
        await resetBrowser();
        res.status(500).json({error: err.message});
    }
});

/**
 * Get latest highlight
 */
app.get("/highlights", async (req, res) => {
    const initial_reel_id = req.query.initial_reel_id;
    const reel_ids = req.query.reel_ids;
    if (!initial_reel_id) return res.status(400).json({error: "No highlight Id provided"});

    try {
        // Recreate browser/page if closed
        if (!isPageOk()) await startBrowser();

        let response;

        let obj = copyDataFromSample("highlights");
        // Adjust variable params according to api
        obj.variables.initial_reel_id = initial_reel_id;
        obj.variables.reel_ids = reel_ids;
        const results = await graphql(obj);
        if(results.data)
            response = results.data.xdt_api__v1__feed__reels_media__connection.edges.map(e => ({
                type: "highlight",
                id: e.node.id,
                title: e.node.title,
                items: e.node.items.map(f => ({
                    id: f.id,
                    pk: f.pk,
                    image_versions2: f.image_versions2.candidates,
                    video_versions: f.video_versions,
                    video_duration: f.video_duration,
                    taken_at: f.taken_at,
                    viewer_count: f.viewer_count,
                })),
                user: e.node.user,
                url: e.node.cover_media.cropped_image_version?.url
            }));

        res.json(response);

    } catch (err) {
        console.error("Search error:", err);
        await resetBrowser();
        res.status(500).json({error: err.message});
    }
});

/**
 * Get reels
 */
app.get("/reels", async (req, res) => {
    const userId = req.query.id;
    if (!userId) return res.status(400).json({error: "No user Id provided"});

    try {
        // Recreate browser/page if closed
        if (!isPageOk()) await startBrowser();

        let edges;

        let obj = copyDataFromSample("reels");

        if(req.query.after) obj.variables.after = req.query.after;
        if(req.query.before) obj.variables.before = req.query.before;
        if(req.query.first) obj.variables.first = req.query.first;
        if(req.query.last) obj.variables.last = req.query.last;

        // Adjust variable params according to api
        obj.variables.data.target_user_id = userId;
        const results = await graphql(obj);
        if(results.data)
            edges = results.data.xdt_api__v1__clips__user__connection_v2.edges.map(e => ({
                type: "reel",
                id: e.node.media.id,
                pk: e.node.media.pk,
                like_count: e.node.media.like_count,
                product_type: e.node.media.product_type,
                comment_count: e.node.media.comment_count,
                view_count: e.node.media.view_count,
                image_versions2: e.node.media.image_versions2.candidates
            }));


        res.json({
            results: edges,
            page_info: results.data.xdt_api__v1__clips__user__connection_v2.page_info
        });

    } catch (err) {
        console.error("Search error:", err);
        await resetBrowser();
        res.status(500).json({error: err.message});
    }
});

/**
 * Get media info (highlight)
 */
app.get("/media-info", async (req, res) => {
    const pk = req.query.pk;
    if (!pk) return res.status(400).json({error: "No pk provided"});

    try {
        // Recreate browser/page if closed
        if (!isPageOk()) await startBrowser();

        const results = await get_media_info(pk);
        const media = results.items.shift();


        res.json({
            pk: media.pk,
            id: media.id,
            caption: media.caption.text,
            like_count: media.like_count,
            play_count: media.play_count,
            taken_at: media.taken_at,
            comment_count: media.comment_count,
            image_versions2: media.image_versions2.candidates,
            video_versions: media.video_versions,
            video_dash_manifest: media.video_dash_manifest,
            video_duration: media.video_duration,
        });

    } catch (err) {
        console.error("Search error:", err);
        await resetBrowser();
        res.status(500).json({error: err.message});
    }
});


// 🖥 Start server
const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`API server running on port ${PORT}`);
    await startBrowser(); // ⬅️ Puppeteer starts automatically here
});
