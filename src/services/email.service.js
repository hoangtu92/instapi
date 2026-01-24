const nodemailer = require("nodemailer");
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const creds = JSON.parse(fs.readFileSync('credentials.json'));
const tokens = JSON.parse(fs.readFileSync('token.json'));

const auth = new google.auth.OAuth2(
    creds.web.client_id,
    creds.web.client_secret,
    "https://cdn-api.privateig.com/gmail_postback"
);

auth.setCredentials(tokens);

const gmail = google.gmail({ version: 'v1', auth });

async function sendEmail(subject, text) {
    const transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
    });

    const message = await transporter.sendMail({
        from: 'Instapi Alert <no-reply@gmail.com>',
        to: 'galaxy.on.love@gmail.com',
        subject: subject,
        text: text,
    });

    const raw = message.message.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
    });

    console.log('Email sent');
}


module.exports = sendEmail;

