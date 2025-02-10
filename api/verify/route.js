require('dotenv').config({ path: '.env' });
const app = require('../product/route');
const errors = require('../../data/error.json');
const helper = require('../../components/helper/helper');
const db = require('../../components/database/db');

app.post('/auth/verify', (req, res) => {
    const { token } = req.body;
    if (!helper.detectParam(token)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `token`), errors[400]['400.parameter'].code);

    const hsl = helper.decodeKey(token);
    if (hsl == false || hsl == 'expired') return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);

    return db.getUserData(hsl.id, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 404, false, errors[404]['404.jwt'].message, errors[404]['404.jwt'].code);
        
        return helper.response(res, 200, true, `Success!`, null, result);
    })
})

app.post('/product/verify', (req, res) => {
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

        return db.getProduct(product_id, (rest, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!result) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

            return helper.response(res, 200, true, 'Berhasil!', null, rest);
        })
    })
})

module.exports = app;