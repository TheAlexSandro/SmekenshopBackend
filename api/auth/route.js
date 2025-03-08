const errors = require('../../data/error.json');
const helper = require('../../components/helper/helper');
const db = require('../../components/database/db');

const authSignup = (req, res) => {
    const { name, email, instance, whatsapp, password } = req.body;
    if (!helper.detectParam(name, email, password)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `name, email, password`), errors[400]['400.parameter'].code);

    return db.addUser(name, instance, whatsapp, email, password, null, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[400]['400.available'].message, errors[400]['400.available'].code);

        const accessToken = helper.generateKey({ id: result });

        db.saveAccessToken(accessToken, result);
        return helper.response(res, 200, true, `Berhasil!`, null, { access_token: accessToken });
    });
}

const authSignin = (req, res) => {
    const { email, password } = req.body;
    if (!helper.detectParam(email, password)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `email, password`), errors[400]['400.parameter'].code);

    db.getUserData(email, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

        return helper.pwd('dec', password, result.password, (isValid, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!isValid) return helper.response(res, 401, false, errors[401]['401.password'].message, errors[401]['401.password'].code);

            const accessToken = helper.generateKey({ id: result.id });

            db.saveAccessToken(accessToken, result.id);
            return helper.response(res, 200, true, `Berhasil!`, null, { access_token: accessToken });
        });
    })
}

const authSignout = (req, res) => {
    const { access_token } = req.body;
    if (!helper.detectParam(access_token)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `access_token`), errors[400]['400.parameter'].code);

    db.removeAccessToken(access_token, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);

        return helper.response(res, 200, true, `Berhasil!`);
    });
}

module.exports = { authSignup, authSignin, authSignout };