const errors = require('../../data/error.json');
const helper = require('../../components/helper/helper');
const db = require('../../components/database/db');
const { file } = require('googleapis/build/src/apis/file');

const updateAccount = (req, res) => {
    const { account_id, email, field, new_value, action, password } = req.body;
    if (!helper.detectParam(field, action)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `field, action`), errors[400]['400.parameter'].code);

    if ((!account_id || account_id == '') && (!email || email == '')) return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter account_id atau email.', errors[400]['400.error'].code);

    if (account_id && account_id == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `account_id`), errors[400]['400.opt_param'].code);

    if (email && email == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `email`), errors[400]['400.opt_param'].code);

    if (!/(set|unset)/i.exec(action)) return helper.response(res, 400, false, 'Aksi tidak valid, tersedia: set, unset', errors[400]['400.error'].code);

    if ((!new_value && new_value == '') && /(set)/i.exec(action)) return helper.response(res, 400, false, 'Parameter new_value dibutuhkan jika action adalah set.', errors[400]['400.error'].code);

    if (field.includes('product')) return helper.response(res, 400, false, 'Untuk memperbarui daftar produk, Anda harus menggunakan endpoint /product/upload atau /product/remove', errors[400]['400.error'].code);

    if (field.includes('password') && (!password && password == '')) return helper.response(res, 400, false, 'Parameter password dibutuhkan jika menggunakan field ini dan harus memiliki nilai.', errors[400]['400.error'].code);

    if (file.includes('profile_photo') && action != 'unset') return helper.response(res, 400, false, 'Anda hanya bisa menggunakan endpoint ini dengan aksi unset jika field adalah profile_photo', errors[400]['400.error'].code);

    const ident = (email) ? email : account_id;
    db.getUserData(ident, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

        if (field == 'profile_photo') {
            const profLink = result.profile_photo;
            const match = profLink.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/)[1];

            db.removeFromDrive(match, (rrs, err) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            })
        } else if (field == 'password') {
            helper.pwd('dec', password, result.password, (isValid, err) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                if (!isValid) return helper.response(res, 401, false, errors[401]['401.password'].message, errors[401]['401.password'].code);

                db.updateUserData(ident, action, new_value, field, (rest, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);

                    return helper.response(res, 200, true, `Berhasil!`, null, { id: (account_id) ? account_id : null, email: (email) ? email : null });
                })
            })
        } else {
            db.updateUserData(ident, action, new_value, field, (rest, err) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);

                return helper.response(res, 200, true, `Berhasil!`, null, { id: (account_id) ? account_id : null, email: (email) ? email : null });
            })
        }
    })
}

const updateProfile = (req, res) => {
    const { server_id, account_id, email } = req.body;
    if (!helper.detectParam(server_id)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `server_id, account_id`), errors[400]['400.parameter'].code);

    if (server_id != process.env.SERVER_ID) return helper.response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);

    if ((!account_id || account_id == '') && (!email || email == '')) return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter account_id atau email.', errors[400]['400.error'].code);

    if (account_id && account_id == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `account_id`), errors[400]['400.opt_param'].code);

    if (email && email == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `email`), errors[400]['400.opt_param'].code);

    if (!req.file) {
        return helper.response(res, 400, false, errors[400]['400.missing_file'].message, errors[400]['400.missing_file'].code);
    }

    const ident = (email) ? email : account_id;
    db.getUserData(ident, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

        const getProfile = result.profile_photo;
        if (getProfile != null) {
            const match = getProfile.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/)[1];
            db.removeFromDrive(match, (rest, err) => { });
        }

        db.addToDrive(req.file, null, 'profile', (rest, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            const links = rest.link;

            db.updateUserData(ident, 'set', links, 'profile_photo', (rr, err) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);

                return helper.response(res, 200, true, `Berhasil!`, null, { id: (account_id) ? account_id : null, email: (email) ? email : null });
            })
        })
    })
}

module.exports = { updateAccount, updateProfile };