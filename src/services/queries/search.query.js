/**
 *
 * @param query
 * @returns {{variables: string, doc_id: string}}
 */
function searchQuery(query){

    return {
        "variables": JSON.stringify({
            "data": {
                "context": "blended",
                "include_reel": "true",
                "query": query,
                "rank_token": "",
                "search_surface": "web_top_search"
            },
            "hasQuery": true
        }),
        "doc_id": "24146980661639222"
    }

}

module.exports = {searchQuery}
