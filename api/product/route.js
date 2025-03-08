require('dotenv').config({ path: '.env' });
const errors = require('../../data/error.json');
const helper = require('../../components/helper/helper');
const db = require('../../components/database/db');

const productUpload = (req, res) => {
    const { server_id, name, description, category, price, seller_id, action, product_id, old_file_id } = req.body;
    if (!helper.detectParam(server_id, seller_id)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `server_id, seller_id`), errors[400]['400.parameter'].code);

    if (server_id != process.env.SERVER_ID) return helper.response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);

    if ((!action || (action && action == '')) && !helper.detectParam(name, description, category, price)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `server_id, name, description, category, price`), errors[400]['400.parameter'].code);

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
                    db.addToDrive(file, null, 'product', (driveResult, err) => {
                        if (err) return reject(err);
                        resolve(driveResult);
                    });
                })
            );
            var results = await Promise.all(uploadPromises);

            if (!action) {
                db.addProduct(name, description, price, category, results, seller_id, (rest, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                    return db.updateUserProducts(seller_id, 'add', rest, (rr, err) => {
                        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                        if (!rr) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

                        return helper.response(res, 200, true, 'Berhasil!', null, { rest });
                    })
                });
            } else if (action == 'add') {
                for (var i = 0; i < results.length; i++) {
                    db.updateProductImage(product_id, null, 'add', results[i].file_id, results[i].file_name, results[i].link, (rest, err) => {
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
                            db.removeFromDrive(file, (rer, err) => {
                                db.updateProductImage(product_id, file, 'update', results[i].file_id, results[i].file_name, results[i].link, (rest, err) => {
                                    if (err) return reject(err);
                                    if (!rest) return reject(rest);
                                    resolve(rest);
                                });
                            })
                        });
                    });

                    return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                } else {
                    db.removeFromDrive(old_file_id, (rer, err) => {
                        db.updateProductImage(product_id, old_file_id, 'update', results[0].file_id, results[0].file_name, results[0].link, (rest, err) => {
                            console.log(err);
                            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                            if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                            return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                        })
                    })
                }
            }
        })
    } catch (e) {
        console.log(e);
        return helper.response(res, 400, false, e.message, errors[400]['400.error'].code);
    }
}

const productUpdate = (req, res) => {
    const { seller_id, product_id, field, action, new_value, old_file_id } = req.body;
    if (!helper.detectParam(seller_id, product_id, field)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `seller_id, product_id, field`), errors[400]['400.parameter'].code);

    if (action && !/(set|remove)/i.exec(action)) return helper.response(res, 400, false, 'Parameter aksi tidak valid, tersedia: set, remove (baca selengkapnya di file README.md)', errors[400]['400.error'].code);

    if (action == 'set' && (!new_value || new_value == '')) return helper.response(res, 400, false, 'Parameter new_value tidak boleh kosong jika action set.', errors[400]['400.error'].code);

    if (field == 'images' && action != 'remove') return helper.response(res, 400, false, 'Field images hanya mendukung aksi remove.', errors[400]['400.error'].code);

    if (field == 'images' && (!old_file_id || old_file_id == '')) return helper.response(res, 400, false, 'Parameter old_file_id tidak boleh kosong jika field=images.', errors[400]['400.error'].code);

    db.getUserData(seller_id, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (result.products.indexOf(product_id) == -1) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

        if (field != 'images') {
            if (/(like|interaction)/i.exec(field)) {
                db.getProduct(product_id, (rrr, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    var getData = rrr[field];
                    var newValue = Number(getData) + 1;

                    db.updateProduct(product_id, newValue, field, (rest, err) => {
                        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                        if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);
                        if (rest == 'not_found') return helper.response(res, 400, false, `Tidak ada field: ${field}`, errors[404]['404.error'].code);

                        return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                    })
                });
            } else {
                db.updateProduct(product_id, new_value, field, (rest, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);
                    if (rest == 'not_found') return helper.response(res, 400, false, `Tidak ada field: ${field}`, errors[404]['404.error'].code);

                    return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                })
            }
        } else {
            if (old_file_id.includes('[') && old_file_id.includes(']')) {
                const oldFileID = String(old_file_id).replace(/\[/g, '').replace(/\]/g, '').split(',');

                oldFileID.map((file, i) => {
                    return new Promise((resolve, reject) => {
                        db.removeFromDrive(file, (rests, err) => {
                            if (err) return reject(err);

                            db.updateProductImage(product_id, null, 'rm', true, file, null, (rest, err) => {
                                if (err) return reject(err);
                                if (!rest) return reject(rest);
                                resolve(rest);
                            });
                        })
                    });
                });

                return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
            } else {
                db.removeFromDrive(old_file_id, (rests, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);

                    db.updateProductImage(product_id, old_file_id, 'rm', null, null, null, (rest, err) => {
                        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                        if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                        return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
                    });
                })
            }
        }
    })
}

const productRemove = (req, res) => {
    const { seller_id, product_id } = req.body;
    if (!helper.detectParam(seller_id, product_id)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `seller_id, product_id`), errors[400]['400.parameter'].code);

    db.getUserData(seller_id, (result, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (result.products.indexOf(product_id) == -1) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

        db.getProduct(product_id, (rest, err) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!rest) return helper.response(res, 400, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

            const removePromises = rest.images.map(rts => {
                return new Promise((resolve, reject) => {
                    db.removeFromDrive(rts.file_id, (rr, err) => {
                        resolve(rr);
                    });
                });
            });

            Promise.all(removePromises).then(() => {
                db.removeProduct(seller_id, product_id, (rest, err) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rest) return helper.response(res, 400, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                    return helper.response(res, 200, true, 'Produk dihapus!');
                })
            }).catch(err => helper.response(res, 400, false, err, errors[400]['400.error'].code));
        })
    })
}

const productSummary = (req, res) => {
    db.getAllProduct((rest, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!rest) return helper.response(res, 400, false, errors[404]['404.no_product'].message, errors[404]['404.no_product'].code);

        if (!Array.isArray(rest)) return helper.response(res, 400, false, "Data format error", errors[400]['400.error'].code);

        const sortProduct = helper.sortedProduct(rest);
        if (!sortProduct.ok) return helper.response(res, 400, false, sortProduct.msg, errors[400]['400.error'].code);

        return helper.response(res, 200, true, `Nanti kalau mau nampilin halaman produk, ambil product_id nya lalu verifikasi ke /verify/product, biar viewnya nambah. Oke?`, null, sortProduct.result);
    });
};

const productSearch = (req, res) => {
    const { query } = req.body;
    if (!helper.detectParam(query)) return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `query`), errors[400]['400.parameter'].code);

    db.getAllProduct((rest, err) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!rest) return helper.response(res, 400, false, errors[404]['404.no_product'].message, errors[404]['404.no_product'].code);

        const search = helper.searchProduct(rest, query);
        if (search.length > 0) {
            const updatedProducts = search.map(product => ({
                ...product,
                images: product.images.map(image => ({
                    ...image,
                    link: `${process.env.GOOGLE_DRIVE_URL}${image.file_id}`
                }))
            }));

            return helper.response(res, 200, true, `Nanti kalau mau nampilin halaman produk, ambil product_id nya lalu verifikasi ke /verify/product, biar viewnya nambah. Oke?`, null, updatedProducts);
        } else {
            const sortProduct = helper.sortedProduct(rest);
            if (!sortProduct.ok) return helper.response(res, 400, false, sortProduct.msg, errors[400]['400.error'].code);

            return helper.response(res, 200, true, `Nanti kalau mau nampilin halaman produk, ambil product_id nya lalu verifikasi ke /verify/product, biar viewnya nambah. Oke?`, null, sortProduct.result);
        }
    })
}

module.exports = { productUpload, productUpdate, productRemove, productSummary, productSearch };