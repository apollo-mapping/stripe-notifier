const fs = require('fs');
const opn = require('opn');
const readline = require('readline-sync');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
console.log(TOKEN_DIR);
const TOKEN_PATH = TOKEN_DIR + 'gmail-token.json';

module.exports = (callback) => {

    authorize(JSON.parse(fs.readFileSync('client_secret.json')), (auth) => {
        callback(auth);
    })
};

function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.

    try {
        let token = fs.readFileSync(TOKEN_PATH);
        oauth2Client.credentials = JSON.parse(token);
        callback(oauth2Client);
    } catch (e) {
        getNewToken(oauth2Client, callback);
    }
}

function getNewToken(oauth2Client, callback) {
    let authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    opn(authUrl);
    console.log("This is your auth url: " + authUrl);
    let code = readline.question('Enter the code you got here: ');
    oauth2Client.getToken(code, function(err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        callback(oauth2Client);
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}