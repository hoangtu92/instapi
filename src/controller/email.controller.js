/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const {google} = require("googleapis");
const fs = require("fs");

const postBack = async (req, res) => {

    if(!req.query.code) return res.status(403);

    const creds = JSON.parse(fs.readFileSync('credentials.json', 'utf-8'));
    const auth = new google.auth.OAuth2(
        creds.web.client_id,
        creds.web.client_secret,
        "https://cdn-api.privateig.com/gmail_postback"
    );

    const { tokens } = await auth.getToken(req.query.code);
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token saved to token.json');
    res.status(200);

}

module.exports = {postBack}
