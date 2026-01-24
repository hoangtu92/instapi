/**
 *
 * @returns {{variables: {user_id}, server_timestamps: string, fb_api_req_friendly_name: string, doc_id: string, fb_api_caller_class: string}}
 * @param reel_ids
 */
function highlightsQuery(reel_ids = []){
    return {
        "fb_api_caller_class": "RelayModern",
        "fb_api_req_friendly_name": "PolarisStoriesV3HighlightsPageQuery",
        "server_timestamps": "true",
        "variables": JSON.stringify({
            "initial_reel_id": reel_ids[0],
            "reel_ids": reel_ids,
            "first": 3,
            "last": 2
        }),
        "doc_id": "25300536909575943"
    }

}

module.exports = {highlightsQuery}
