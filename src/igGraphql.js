const axios = require("axios");
const {getCookieHeader, graphqlData} = require("./browser.js")
const client = axios.create({
    timeout: 15000,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": "936619743392459",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": getCookieHeader(),
        "Referer": "https://www.instagram.com/",
    },
});

async function graphql(obj) {

    obj.variables = JSON.stringify(obj.variables);
    obj.__req = (parseInt(obj.__req, 16) + 1).toString(16);

    const res = await client.post(
        "https://www.instagram.com/graphql/query/",
        new URLSearchParams(obj).toString(),
        {
            headers: graphqlData["request"].headers,
        }
    );

    return res.data;
}

/**
 *
 * @param pk
 * @returns {Promise<any>}
 */
async function get_media_info(pk){

    const res = await client.get(
        `https://www.instagram.com/api/v1/media/${pk}/info/`,
        {
            headers: graphqlData["request"].headers,
        }
    );

    return res.data;

}

module.exports = {graphql, get_media_info};
