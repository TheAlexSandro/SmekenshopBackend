require('dotenv').config({ path: '.env' });
const app = require('../auth/google/route');
const errors = require('../../data/error.json');
const helper = require('../../components/helper/helper');
const db = require('../../components/database/db');
const multer = require('multer');

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

app.post('/product/upload', upload.any(), (req, res) => {
    const { server_id, name, description, category, price, seller_id, action, product_id, old_file_id } = req.body;
    if (!helper.detectParam(server_id, name, description, category, price, seller_id)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `server_id, name, description, category, price, seller_id`), errors[400]['400.parameter'].code);

    if (server_id != process.env.SERVER_ID) return helper.response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);

    if (!req.files || req.files.length === 0) {
        return helper.response(res, 400, false, errors[400]['400.missing_file'].message, errors[400]['400.missing_file'].code);
    }

    if (action && action == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `action`), errors[400]['400.opt_param'].code);

    if (product_id && product_id == '') return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `product_id`), errors[400]['400.opt_param'].code);

    if (action && !/(update|add)/i.exec(action)) return helper.response(res, 400, false, 'Parameter action hanya bisa "update" atau "add".', errors[400]['400.error'].code);

    if ((action && action == 'update') && ((!product_id || product_id == '') || (!old_file_id || old_file_id == ''))) return helper.response(res, 400, false, 'Parameter product_id dan old_file_id harus tersedia jika parameter aksi memiliki nilai.', errors[400]['400.error'].code);

    try {
        db.getUserData(seller_id, async (result, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!result) return helper.response(res, 400, false, errors[404]['404.upload_cancel'].message, errors[404]['404.upload_cancel'].code);
            if (product_id && result.products.indexOf(product_id) == -1) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

            const uploadPromises = req.files.map(file =>
                new Promise((resolve, reject) => {
                    db.addToDrive(file, null, (driveResult, err) => {
                        if (err) return reject(err);
                        resolve(driveResult);
                    });
                })
            );
            var results = await Promise.all(uploadPromises);

            if (!action) {
                db.addProduct(name, description, price, category, results, seller_id, result.name, result.rating, (rest, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                    return db.updateUserData(seller_id, 'push', rest.product_id, 'products', (rr, err) => {
                        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                        if (!rr) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

                        return helper.response(res, 200, true, 'Berhasil!', null, { product_id: rest.product_id });
                    })
                });
            } else if (action == 'add') {
                for (var i = 0; i < results.length; i++) {
                    db.updateProductArray(product_id, 'add', false, null, results[i].file_id, results[i].file_name, results[i].link, (rest, err) => {
                        if (err) return;
                        if (!rest) return;
                    });
                }

                return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
            } else {
                if (old_file_id.includes('[')) {
                    const oldFileID = String(old_file_id).replace(/\[/g, '').replace(/\]/g, '').split(',');

                    oldFileID.map((file, i) => {
                        return new Promise((resolve, reject) => {
                            db.updateProductArray(product_id, 'update', false, file, results[i].file_id, results[i].file_name, results[i].link, (rest, err) => {
                                if (err) return reject(err);
                                if (!rest) return reject(rest);
                                resolve(rest);
                            });
                        });
                    });

                    return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                } else {
                    db.updateProductArray(product_id, 'update', false, old_file_id, results[0].file_id, results[0].file_name, results[0].link, (rest, err) => {
                        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                        if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);
                        
                        return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                    })
                }
            }
        })
    } catch (e) {
        console.log(e);
        return helper.response(res, 400, false, e.message, errors[400]['400.error'].code);
    }
})

app.post('/product/update', (req, res) => {
    const { seller_id, product_id, field, action, new_value, old_file_id } = req.body;
    if (!helper.detectParam(seller_id, product_id, field, action)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `seller_id, product_id, field, action`), errors[400]['400.parameter'].code);

    if (!/(set|pull|push|unset)/i.exec(action)) return helper.response(res, 400, false, 'Parameter aksi tidak valid, tersedia: set, pull, push, unset (baca selengkapnya di file README.md)', errors[400]['400.error'].code);

    if (new_value && new_value == '') {
        if (action != 'unset' && new_value) return helper.response(res, 400, false, 'Parameter new_value hanya bisa digunakan ketika action bukan unset.', errors[400]['400.error'].code);

        return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `new_value`), errors[400]['400.opt_param'].code);
    }

    if (field == 'products' && action != 'pull') return helper.response(res, 400, false, 'Field products hanya mendukung aksi pull.', errors[400]['400.error'].code);

    db.getUserData(seller_id, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (result.products.indexOf(product_id) == -1) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

        if (field != 'products') {
            db.updateProduct(product_id, action, new_value, field, (rest, err) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);
                if (rest == 'not_found') return helper.response(res, 400, false, `Tidak ada field: ${field}`, errors[404]['404.error'].code);

                return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
            })
        } else {
            if (old_file_id.includes('[')) {
                const oldFileID = String(old_file_id).replace(/\[/g, '').replace(/\]/g, '').split(',');

                const fileMap = oldFileID.map((file, i) => {
                    return new Promise((resolve, reject) => {
                        db.removeFromDrive(file, (rests, err) => {
                            if (err) return reject(err);

                            db.updateProductArray(product_id, true, file, null, null, null, (rest, err) => {
                                if (err) return reject(err);
                                if (!rest) return reject(rest);
                                resolve(rest);
                            });
                        })
                    });
                });

                return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
            } else {
                db.removeFromDrive(file, (rests, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);

                    db.updateProductArray(product_id, true, old_file_id, null, null, null, (rest, err) => {
                        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                        if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                        return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                    });
                })
            }
        }
    })
})

app.post('/product/remove', (req, res) => {
    const { seller_id, product_id } = req.body;
    if (!helper.detectParam(seller_id, product_id)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `seller_id, product_id`), errors[400]['400.parameter'].code);

    db.getUserData(seller_id, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (result.products.indexOf(product_id) == -1) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

        db.getProduct(product_id, (rest, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!rest) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

            rest.products.map((rts) => {
                db.removeFromDrive(rts.file_id, (rr, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                })
            })

            db.removeProduct(seller_id, product_id, (rest, err) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                return helper.response(res, 200, true, 'Produk dihapus!');
            })
        })
    })
})

module.exports = app;