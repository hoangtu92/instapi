/**
 *
 * @param id
 * @returns {{variables: string, doc_id: string}}
 */
function storiesQuery(id){
    return {
        "variables": JSON.stringify({
            reel_ids_arr: [id]
        }),
        "doc_id": "25215717348091501"
    }

}

module.exports = {storiesQuery}
