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
                "search_session_id":"8dd1aa99-7b5b-49c6-988c-a7a4fd1dd90a",
                "search_surface": "web_top_search"
            },
            "hasQuery": true
        }),
        "doc_id": "24146980661639222"
    }

}

module.exports = {searchQuery}
