const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');

const creds = JSON.parse(fs.readFileSync('credentials.json'));
const auth = new google.auth.OAuth2(
    creds.web.client_id,
    creds.web.client_secret,
    "https://cdn-api.privateig.com/gmail_postback"
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
});

console.log('Open this URL:\n', url);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Paste code here: ', async (code) => {
    const { tokens } = await auth.getToken(code);
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token saved to token.json');
    rl.close();
});
