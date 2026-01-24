/**
 *
 * @param target_profile_id
 * @param before
 * @param after
 * @param first
 * @param last
 * @returns {{variables: string, doc_id: string}}
 */
function reelsQuery(target_profile_id, {before, after, first, last}){
    return {
        "variables": JSON.stringify({
            "data": {
                "include_feed_video": true,
                "page_size": 12,
                "target_user_id": target_profile_id
            },
            before,
            after,
            first,
            last
        }),
        "doc_id": "24127588873492897"
    }

}

module.exports = {reelsQuery}
