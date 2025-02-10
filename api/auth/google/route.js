require('dotenv').config({ path: '.env' });
const app = require('../form/route');
const errors = require('../../../data/error.json');
const helper = require('../../../components/helper/helper');
const db = require('../../../components/database/db');
const { google } = require('googleapis');

const data = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: process.env.GOOGLE_REDIRECT_URI
};

app.post('/auth/google/authorize', (req, res) => {
    const oAuth2Client = new google.auth.OAuth2(data.client_id, data.client_secret, data.redirect_uris);

    const request_id = helper.createID(150);
    const server_id = process.env.SERVER_ID;
    const generateJWT = helper.generateKey({ id: request_id }, '1m');

    const stateObject = { request_id: generateJWT, server_id };
    const stated = Buffer.from(JSON.stringify(stateObject)).toString('base64');

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
        state: stated
    });

    return helper.response(res, 200, true, `Berhasil!`, null, { url: authUrl });
});

app.post('/auth/google/callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!helper.detectParam(code, state)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `code, state`), errors[400]['400.parameter'].code);

        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        const { request_id } = decodedState;
        const decodeJWT = helper.decodeKey(request_id);

        if (!request_id || /(false|expired)/g.exec(decodeJWT)) {
            return helper.response(res, 400, false, errors[400]['400.request_id'].message, errors[400]['400.request_id'].code);
        }

        const oAuth2Client = new google.auth.OAuth2(data.client_id, data.client_secret, data.redirect_uris);
        return oAuth2Client.getToken(code, (err, result) => {
            if (err && err.status == 400) { return helper.response(res, 401, false, 'Kode telah dicabut.', errors[401]['401.error'].code); } else if (err && err.status != 400) { return helper.response(res, 401, false, 'Bad Request', errors[401]['401.error'].code); }

            return oAuth2Client.verifyIdToken({ idToken: result.id_token, audience: data.client_id }, (err, result) => {
                if (err) return helper.response(res, 401, false, 'Bad Request', errors[401]['401.error'].code);
                const payload = result.getPayload()
                const { email, name, picture } = payload;

                db.addUser(name, email, 'google', null, picture, (rest, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rest) {
                        return db.getUserData(email, (rr, err) => {
                            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                            const jwts = helper.generateKey({ id: rr.id });
                            return helper.response(res, 200, true, `Berhasil!`, null, { token: jwts });
                        })
                    } else {
                        const jwts = helper.generateKey({ id: rest });
                        return helper.response(res, 200, true, `Berhasil!`, null, { token: jwts });
                    }
                });
            })
        });
    } catch (err) {
        console.error(err);
        return helper.response(res, 401, false, 'Failed to login', errors[401]['401.error'].code);
    }
});

module.exports = app;