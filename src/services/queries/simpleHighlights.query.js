/**
 *
 * @param profile_id
 * @param before
 * @param after
 * @param first
 * @param last
 * @returns {{variables: string, doc_id: string}}
 */
function simpleHighLightsQuery(profile_id, {before, after, first, last}){
    return {
        "variables": JSON.stringify({
            "user_id": profile_id,
            before, after, first, last
        }),
        "doc_id": "9814547265267853"
    }

}

module.exports = {simpleHighLightsQuery}
