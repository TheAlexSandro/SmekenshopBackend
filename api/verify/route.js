require('dotenv').config({ path: '.env' });
const errors = require('../../data/error.json');
const helper = require('../../components/helper/helper');
const db = require('../../components/database/db');

const verifyToken = (req, res) => {
    const { access_token } = req.body;
    if (!helper.detectParam(access_token)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `access_token`), errors[400]['400.parameter'].code);

    db.getAccessToken(access_token, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);

        const hsl = helper.decodeKey(access_token);
        if (hsl == false || hsl == 'expired') {
            db.removeAccessToken(access_token, null);
            return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);
        }

        return db.getUserData(hsl.id, (result, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!result) return helper.response(res, 404, false, errors[404]['404.jwt'].message, errors[404]['404.jwt'].code);

            if (!result.profile_photo) { result.profile_photo = `${process.env.GOOGLE_DRIVE_URL}${process.env.PROFILE_EMPTY}` }
            
            return helper.response(res, 200, true, `Success!`, null, result);
        })
    })
}

const verifyProduct = (req, res) => {
    const { product_id, seller_id, email } = req.body;
    if (!helper.detectParam(product_id)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `product_id, seller_id`), errors[400]['400.parameter'].code);

    if ((!seller_id || seller_id == '') && (!email || email == '')) return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter seller_id atau email.', errors[400]['400.error'].code);

    if (seller_id && seller_id == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `seller_id`), errors[400]['400.opt_param'].code);

    if (email && email == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `email`), errors[400]['400.opt_param'].code);

    const ident = email ? email : seller_id;
    db.getUserData(ident, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (result.products.indexOf(product_id) == -1) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

        db.getProduct(product_id, (rest, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!result) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

            rest.images.forEach(img => {
                img.link = `${process.env.GOOGLE_DRIVE_URL}${img.file_id}`
            });
            rest['view'] = Number(rest['view']) + 1;

            db.updateProduct(product_id, rest['view'], 'view');
            return helper.response(res, 200, true, 'Berhasil!', null, rest);
        })
    })
}

const verifyAccount = (req, res) => {
    const { account_id, email } = req.body;

    if ((!account_id || account_id == '') && (!email || email == '')) return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter account_id atau email.', errors[400]['400.error'].code);

    if (account_id && account_id == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `account_id`), errors[400]['400.opt_param'].code);

    if (email && email == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `email`), errors[400]['400.opt_param'].code);

    const ident = email ? email : account_id;
    db.getUserData(ident, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        const obj = JSON.stringify(result, (key, value) => (key === 'password') ? undefined : value);

        if (!result.profile_photo) { result.profile_photo = `${process.env.GOOGLE_DRIVE_URL}${process.env.PROFILE_EMPTY}` }
        
        return helper.response(res, 200, true, `Success!`, null, JSON.parse(obj));
    })
}

module.exports = { verifyToken, verifyProduct, verifyAccount };