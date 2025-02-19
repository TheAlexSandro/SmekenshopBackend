const errors = require('../../../data/error.json');
const helper = require('../../../components/helper/helper');
const db = require('../../../components/database/db');

const authSignup = (req, res) => {
    const { name, email, instance, whatsapp, password } = req.body;
    if (!helper.detectParam(name, email, password)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `name, email, password`), errors[400]['400.parameter'].code);

    return db.addUser(name, instance, whatsapp, email, 'form', password, null, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[400]['400.available'].message, errors[400]['400.available'].code);

        const jwts = helper.generateKey({ id: result });
        return helper.response(res, 200, true, `Berhasil!`, null, { token: jwts });
    });
}

const authSignin = (req, res) => {
    const { email, password } = req.body;
    if (!helper.detectParam(email, password)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `email, password`), errors[400]['400.parameter'].code);

    return db.getUserData(email, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result || (result && result.login_type == 'google')) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

        return helper.pwd('dec', password, result.password, (isValid, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!isValid) return helper.response(res, 401, false, errors[401]['401.password'].message, errors[401]['401.password'].code);

            console.log(result);
            const jwts = helper.generateKey({ id: result.id });
            return helper.response(res, 200, true, `Berhasil!`, null, { token: jwts });
        });
    })
}

module.exports = { authSignup, authSignin };