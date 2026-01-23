const {graphqlData} = require("./browser");
const {request, get_media_info} = require("./igGraphql");
const LOG = require("./log");
const Config = require("./config");
const Redis = require("./redis");

const errorHandler = async (res, e) => {
    LOG.error(e.message);

    let state = await Redis.get("browser:state");
    if(state !=='active'){
        await Config.setRandomAccount();
        process.exit(0)
    }

    res.status(500).json({error: "Please try again"});
}
/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const searchProfile = async (req, res) => {

    const username = req.query.q;
    if (!username) return res.status(400).json({error: "No username provided"});
    const type = "PolarisSearchBoxRefetchableQuery";
    try {
        let response = [];

        let variables = graphqlData[type].postData.variables;

        variables.data.query = username;

        const results = await request(type, variables, 720);

        if (results)

            response = results.map(e => ({
                id: e.user.id,
                is_verified: e.user.is_verified,
                username: e.user.username,
                full_name: e.user.full_name,
                profile_pic_url: e.user.profile_pic_url
            }));

        res.json(response);

    } catch (e) {
        await errorHandler(res, e)
    }
}
/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getProfile = async (req, res) => {

    const id = req.query.id;
    if (!id) return res.status(400).json({error: "No id provided"});

    try {
        const type = "PolarisProfilePageContentQuery";
        let variables = graphqlData[type].postData.variables

        variables.id = id;

        let response;

        const user = await request(type, variables, 720);

        if (user) {

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
                is_private: user.is_private,
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
        await errorHandler(res, e)
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getPosts = async (req, res) => {
    const username = req.query.u;
    if (!username) return res.status(400).json({error: "No username provided"})

    try {

        let response;

        const type = "PolarisProfilePostsQuery";
        let variables = graphqlData[type].postData.variables

        // Adjust variable params according to api
        variables.username = username;
        variables.after = req.query.after || null;
        variables.before = req.query.before || null;
        variables.first = req.query.first || null;
        variables.last = req.query.last || null;


        const results = await request(type, variables, 0.5);

        if (results.edges && results.edges.length) {
            response = results.edges.map(e => ({
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
                }) : null,
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

            res.json({
                results: response,
                page_info: results.page_info
            });
        } else res.json({results: [], page_info: null})


    } catch (e) {
        await errorHandler(res, e)
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getStories = async (req, res) => {
    const userId = req.query.id;
    if (!userId) return res.status(400).json({error: "No user Id provided"});

    try {
        let response = [];

        const type = "PolarisStoriesV3ReelPageStandaloneQuery";
        let variables = graphqlData[type].postData.variables


        // Adjust variable params according to api
        variables.reel_ids_arr = [userId];
        const results = await request(type, variables);

        if (results)
            response = results.map(e => ({
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

    } catch (e) {
        await errorHandler(res, e)
    }
}
/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getHighLightsPreview = async (req, res) => {
    const userId = req.query.id;
    if (!userId) return res.status(400).json({error: "No user Id provided"});

    try {

        const type = "PolarisProfileStoryHighlightsTrayContentQuery";
        let variables = graphqlData[type].postData.variables

        if (req.query.after) variables.after = req.query.after;
        if (req.query.before) variables.before = req.query.before;
        if (req.query.first) variables.first = req.query.first;
        if (req.query.last) variables.last = req.query.last;

        // Adjust variable params according to api
        variables.user_id = userId;
        const results = await request(type, variables);
        if (results.edges && results.edges.length){
            res.json({
                results: results.edges.map(e => ({
                    type: "highlight",
                    title: e.node.title,
                    id: e.node.id,
                    user: e.node.user,
                    url: e.node.cover_media.cropped_image_version?.url
                })),
                page_info: results.page_info
            });
        }
        else{
            res.json({
                results: [],
                page_info: null
            });
        }


    } catch (e) {
        await errorHandler(res, e)
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getHighLights = async (req, res) => {
    const initial_reel_id = req.query.initial_reel_id;
    const reel_ids = req.query.reel_ids;
    if (!initial_reel_id) return res.status(400).json({error: "No highlight Id provided"});

    try {

        let response = [];

        const type = "PolarisStoriesV3HighlightsPageQuery";
        let variables = {
            initial_reel_id,
            reel_ids,
            first: 3,
            last: 2
        };

        const results = await request(type, variables);
        if (results) {
            response = results.map(e => ({
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
        }

        res.json(response);

    } catch (e) {
        await errorHandler(res, e)
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getReels = async (req, res) => {
    const userId = req.query.id;
    if (!userId) return res.status(400).json({error: "No user Id provided"});

    try {

        let edges = [];

        const type = "PolarisProfileReelsTabContentQuery";
        let variables = graphqlData[type].postData.variables

        if (req.query.after) variables.after = req.query.after;
        if (req.query.before) variables.before = req.query.before;
        if (req.query.first) variables.first = req.query.first;
        if (req.query.last) variables.last = req.query.last;

        // Adjust variable params according to api
        variables.data.target_user_id = userId;
        const results = await request(type, variables, 5);
        if (results.edges && results.edges.length){
            res.json({
                results: results.edges.map(e => ({
                    type: "reel",
                    id: e.node.media.id,
                    pk: e.node.media.pk,
                    like_count: e.node.media.like_count,
                    product_type: e.node.media.product_type,
                    comment_count: e.node.media.comment_count,
                    view_count: e.node.media.view_count,
                    image_versions2: e.node.media.image_versions2.candidates
                })),
                page_info: results.page_info
            })
        }
        else{
            res.json({
                results: [],
                page_info: null
            });
        }



    } catch (e) {
        await errorHandler(res, e)
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getMediaInfo = async (req, res) => {
    const pk = req.query.pk;
    if (!pk) return res.status(400).json({error: "No pk provided"});

    try {

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

    } catch (e) {
        await errorHandler(res, e)
    }
}


module.exports = {
    searchProfile,
    getProfile,
    getPosts,
    getStories,
    getHighLightsPreview,
    getHighLights,
    getReels,
    getMediaInfo
}
