/**
 *
 * @param profile_name
 * @param before
 * @param after
 * @param first
 * @param last
 * @returns {{variables: {data: {latest_besties_reel_media: boolean, count: number, include_reel_media_seen_timestamp: boolean, latest_reel_media: boolean, include_relationship_info: boolean}, username, __relay_internal__pv__PolarisIsLoggedInrelayprovider: boolean}, server_timestamps: string, fb_api_req_friendly_name: string, doc_id: string, fb_api_caller_class: string}}
 */
function postsQuery(profile_name, {before, after, first, last}){
    return {
        "variables": JSON.stringify({
            "data": {
                "count": 12,
                "include_reel_media_seen_timestamp": true,
                "include_relationship_info": true,
                "latest_besties_reel_media": true,
                "latest_reel_media": true
            },
            "username": profile_name,
            before,
            after,
            first,
            last,
            "__relay_internal__pv__PolarisIsLoggedInrelayprovider": true
        }),
        "doc_id": "24835958312750138"
    }

}

module.exports = {postsQuery}
