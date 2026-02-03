const {request, get_media_info} = require("../services/instagram.service");
const {searchQuery} = require("../services/queries/search.query");
const {profileQuery} = require("../services/queries/profile.query");
const {postsQuery} = require("../services/queries/posts.query");
const {storiesQuery} = require("../services/queries/stories.query");
const {simpleHighLightsQuery} = require("../services/queries/simpleHighlights.query");
const {highlightsQuery} = require("../services/queries/highlights.query");
const {reelsQuery} = require("../services/queries/reels.query");
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

    const postData = searchQuery(username);


    const results = await request(type, postData, 720);

    if(results){
        const data = results.map(e => ({
            id: e.user.id,
            is_verified: e.user.is_verified,
            username: e.user.username,
            full_name: e.user.full_name,
            profile_pic_url: e.user.profile_pic_url
        }));

        res.json(data);
    }
    else
    res.json([]);
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

    const type = "PolarisProfilePageContentQuery";

    const postData = profileQuery(id);

    const user = await request(type, postData, 1);
    if(user) res.json(user);

    else res.json({})

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

    const type = "PolarisProfilePostsQuery";

    const after = req.query.after || null;
    const before = req.query.before || null;
    const first = req.query.first || null;
    const last = req.query.last || null;

    const postData = postsQuery(username, {before, after, first, last});


    const data = await request(type, postData, 0.5);

    if(data && data.edges){
        const results = data.edges.map(e => ({
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
        })) || [];

        res.json({
            results: results,
            page_info: data.page_info
        });
    }
    else res.json({
        results: [],
        page_info: null
    })
}
/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getSimplePosts = async (req, res) => {
    const username = req.query.u;
    if (!username) return res.status(400).json({error: "No username provided"})

    const type = "PolarisProfileSimplePostsQuery";

    const after = req.query.after || null;
    const before = req.query.before || null;
    const first = req.query.first || null;
    const last = req.query.last || null;

    const postData = postsQuery(username, {before, after, first, last});


    const data = await request(type, postData, 0.5);

    if(data && data.edges){
        const results = data.edges.map(e => e.node).map(e => ({
            caption: e.caption?.text,
            id: e.id,
            code: e.code,
            comment_count: e.comment_count,
            like_count: e.like_count,
            image_versions2: e.image_versions2.candidates.filter(e => e.width <= 250),
            taken_at: e.taken_at,
        })) || [];

        res.json({
            results: results,
            page_info: data.page_info
        });
    }
    else res.json({
        results: [],
        page_info: null
    })
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

    const type = "PolarisStoriesV3ReelPageStandaloneQuery";

    const postData = storiesQuery(userId);


    // Adjust variable params according to api
    const data = await request(type, postData);

    if(data){
        const results = data.map(e => ({
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

        res.json(results);
    }

    else res.json([]);
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

    // Adjust variable params according to api
    const after = req.query.after || null;
    const before = req.query.before || null;
    const first = req.query.first || null;
    const last = req.query.last || null;


    const type = "PolarisProfileStoryHighlightsTrayContentQuery";
    const postData = simpleHighLightsQuery(userId, {before, after, first, last})


    // Adjust variable params according to api
    const results = await request(type, postData).then(data => {
        return data ? {
            results: data.edges?.map(e => ({
                type: "highlight",
                title: e.node.title,
                id: e.node.id,
                user: e.node.user,
                url: e.node.cover_media.cropped_image_version?.url
            })) || [],
            page_info: data.page_info
        } : null
    });

    res.json(results);
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

    const type = "PolarisStoriesV3HighlightsPageQuery";

    const postData = highlightsQuery(reel_ids);


    const results = await request(type, postData).then(data => {
        return data ? data.map(e => ({
            type: "highlight",
            id: e.node.id,
            title: e.node.title,
            items: e.node.items.map(f => ({
                id: f.id,
                pk: f.pk,
                image_versions2: f.image_versions2.candidates?.filter(e => e.width >= 500),
                video_versions: f.video_versions,
                video_duration: f.video_duration,
                taken_at: f.taken_at,
                viewer_count: f.viewer_count,
            })),
            user: e.node.user,
            url: e.node.cover_media.cropped_image_version?.url
        })) : null
    });


    res.json(results);
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

    const type = "PolarisProfileReelsTabContentQuery";

    // Adjust variable params according to api
    const after = req.query.after || null;
    const before = req.query.before || null;
    const first = req.query.first || null;
    const last = req.query.last || null;

    const postData = reelsQuery(userId, {before, after, first, last})

    const results = await request(type, postData).then(data => {
        return data ? {
            results: data.edges?.map(e => e.node.media).map(e => ({
                type: "reel",
                code: e.code,
                id: e.id,
                pk: e.pk,
                like_count: e.like_count,
                product_type: e.product_type,
                comment_count: e.comment_count,
                view_count: e.view_count,
                play_count: e.play_count,
                image_versions2: e.image_versions2.candidates
            })) || [],
            page_info: data.page_info
        } : null
    });

    res.json(results);
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

    const results = await get_media_info(pk);

    if(results.items){
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
    }
    else res.json({})

}


module.exports = {
    searchProfile,
    getProfile,
    getPosts,
    getSimplePosts,
    getStories,
    getHighLightsPreview,
    getHighLights,
    getReels,
    getMediaInfo
}
