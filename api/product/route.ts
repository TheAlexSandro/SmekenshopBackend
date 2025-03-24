import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import errors from '../../data/error.json';
import * as helper from '../../components/helper/helper';
import * as db from '../../components/database/db';
import { Request, Response } from 'express';

type ReviewStatus = 'approve' | 'reject' | 'drop';
type ProductStatus = 'approved' | 'rejected' | 'pendings' | 'dropped';

interface ProductListRequest extends Request {
    body: {
        status: string;
        seller_id?: string;
    }
}

interface ProductReviewRequest extends Request {
    body: {
        product_id: string;
        status?: string;
        action: ReviewStatus;
        message?: string;
    }
}

interface ProductUploadRequest extends Request {
    body: {
        server_id: string;
        type: string;
        name: string;
        description: string;
        category: string;
        price: string;
        seller_id: string;
        stock: string;
    };
}

interface ProductUpdateRequest extends Request {
    body: {
        server_id: string;
        seller_id: string;
        product_id: string;
        status: string;
        data?: string;
        action?: ProductStatus;
        old_file_id?: string;
    }
}

interface ProductRemoveRequest extends Request {
    body: {
        seller_id: string;
        status: string;
        product_id: string;
    }
}

interface ProductSummaryRequest extends Request {
    body: {
        limit?: number;
    }
}

interface ProductSearchRequest extends Request {
    body: {
        query?: string;
        category?: string;
    }
}

/**
 * Endpoint untuk mendapatkan daftar produk berdasarkan status.
 */
export const getProductList = (req: ProductListRequest, res: Response): Response | void => {
    const { status, seller_id } = req.body;
    if (!helper.detectParam(status)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace('{PARAMETER}', 'status'), errors[400]['400.parameter'].code);
    }

    if (!['approved', 'rejected', 'pendings', 'dropped'].includes(status)) {
        return helper.response(res, 400, false, 'Parameter status hanya bisa "approved", "rejected", "pendings" dan "dropped".', errors[400]['400.error'].code);
    }

    if (seller_id && seller_id === '') {
        return helper.response(res, 400, false, 'Parameter seller_id tidak boleh kosong jika Anda menggunakan parameter ini.', errors[400]['400.error'].code);
    }

    db.getAllProduct(status, seller_id, async (rest: any, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!rest) return helper.response(res, 404, false, errors[404]['404.product_list'].message, errors[404]['404.product_list'].code);

        const productList = await Promise.all(rest.map(async (product) => {
            const sellerName = await new Promise<string>((resolve) => {
                db.getUserData(product.seller.seller_id, (result: any, err: Error) => {
                    if (err || !result) return resolve('N/A');
                    resolve(result.name);
                });
            });

            return helper.productInject(product, sellerName);
        }))

        return helper.response(res, 200, true, `Berikut adalah daftar produknya`, null, productList);
    });
};

export const productReview = (req: ProductReviewRequest, res: Response): Response | void => {
    const { product_id, status, action, message } = req.body;
    if (!helper.detectParam(product_id, action)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace('{PARAMETER}', 'product_id, action'), errors[400]['400.parameter'].code);
    }

    if (!['approve', 'reject'].includes(action)) {
        return helper.response(res, 400, false, 'Parameter action hanya bisa "approve" atau "reject".', errors[400]['400.error'].code);
    }

    if (message && message === '') {
        return helper.response(res, 400, false, 'Parameter message tidak boleh kosong jika Anda menggunakan parameter ini.', errors[400]['400.error'].code);
    }

    if (status && !['approved', 'rejected', 'pendings', 'dropped'].includes(status)) {
        return helper.response(res, 400, false, 'Parameter status hanya bisa "approved", "rejected", "pendings" dan "dropped".', errors[400]['400.error'].code);
    }
    const st = (status) ? false : true;

    db.getProduct(product_id, status ?? null, st, (rest: any, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!rest) return helper.response(res, 404, false, errors[404]['404.product_review'].message.replace('{STATUS}', status ?? 'apapun'), errors[404]['404.product_review'].code);
        const acts = action.toLocaleLowerCase() as 'approve' | 'reject' | 'drop';
        const cAct = (acts === 'approve') ? 'approved' : (acts === 'reject') ? 'rejected' : 'dropped';
        if (rest.status === cAct) return helper.response(res, 400, false, errors[400]['400.status'].message, errors[400]['400.status'].code);
        if (['approved', 'dropped'].includes(rest.status) && acts === 'reject') return helper.response(res, 400, false, errors[400]['400.status_denied'].message, errors[400]['400.status_denied'].code);

        const act = (acts === 'approve') ? 'disetujui' : (acts === 'reject') ? 'ditolak' : 'dilarang';

        db.reviewProduct(product_id, rest.product_name, rest.description, rest.price, rest.category, rest.images, rest.seller.seller_id, rest.like, rest.view, rest.interaction, rest.release_date, acts, message ?? null, rest.stock, (rest: any, err: Error) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!rest) return helper.response(res, 404, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

            return helper.response(res, 200, true, `Produk telah ${act}!`, null, { product_id });
        });
    });
};

/**
 * Endpoint untuk mengupload produk.
 */
export const productUpload = (req: ProductUploadRequest, res: Response) => {
    const { server_id, seller_id, name, description, category, price, stock } = req.body;
    const files = (req as any).files;
    if (!helper.detectParam(server_id, seller_id, name, description, category, price, stock)) {
        return helper.response(
            res, 400, false,
            errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `server_id, seller_id, name, description, category, price, stock`),
            errors[400]['400.parameter'].code
        );
    }

    if (server_id !== process.env.SERVER_ID) {
        return helper.response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);
    }

    if (!files || files.length === 0) {
        return helper.response(res, 400, false, errors[400]['400.missing_file'].message, errors[400]['400.missing_file'].code);
    }

    try {
        db.getUserData(seller_id, async (result: any, err: Error) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!result) return helper.response(res, 404, false, errors[404]['404.upload_cancel'].message, errors[404]['404.upload_cancel'].code);

            const uploadPromises = files!.map(file =>
                new Promise((resolve, reject) => {
                    db.addToDrive(file, null, 'product', (driveResult: any, err: Error) => {
                        if (err) return reject(err);
                        resolve(driveResult);
                    });
                })
            );
            const results = await Promise.all(uploadPromises);

            db.addProduct(null, name!, description!, price!, category!, results, seller_id, stock, (rest: any, err: Error) => {
                if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                if (!rest) return helper.response(res, 404, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                return db.updateUserProducts(seller_id, 'add', rest, (rr: any, err: Error) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rr) return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

                    return helper.response(res, 200, true, 'Berhasil!', null, { product_id: rest });
                });
            });
        });
    } catch (e: any) {
        console.error(e);
        return helper.response(res, 400, false, e.message, errors[400]['400.error'].code);
    }
};

/**
 * Endpoint untuk mengupdate produk.
 */
export const productUpdate = async (req: ProductUpdateRequest, res: Response): Promise<Response | void> => {
    try {
        const { server_id, seller_id, product_id, status, data, action, old_file_id } = req.body;
        const files = (req as any).files;

        if (!helper.detectParam(server_id, seller_id, status, product_id)) {
            return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace('{PARAMETER}', 'seller_id, product_id, status'), errors[400]['400.parameter'].code);
        }

        if (server_id !== process.env.SERVER_ID) {
            return helper.response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);
        }

        if (!['approved', 'rejected', 'pendings', 'dropped'].includes(status)) {
            return helper.response(res, 400, false, 'Parameter status hanya bisa "approved", "rejected", "pendings" dan "dropped".', errors[400]['400.error'].code);
        }

        var act = String(action).includes(',') ? String(action).replace(/\[|\]/g, '').split(',') : [action];
        var actList = ['add', 'remove', 'update'];

        if (files.length > 0 && act.some(d => !actList.includes(d))) {
            return helper.response(res, 400, false, 'Parameter aksi tidak valid, tersedia: add, remove, update (baca selengkapnya di file README.md)', errors[400]['400.error'].code);
        }

        if (act.includes('remove') && (!old_file_id || old_file_id === '')) {
            return helper.response(res, 400, false, 'Parameter old_file_id tidak boleh kosong jika parameter aksi memiliki nilai remove.', errors[400]['400.error'].code);
        }

        if (act.includes('add') && files.length == 0) {
            return helper.response(res, 400, false, 'Mana file gambarnya?', errors[400]['400.error'].code);
        }

        const result = await new Promise<any>((resolve, reject) => {
            db.getUserData(seller_id, (resData: any, err: Error) => {
                if (err) return reject(err);
                resolve(resData);
            });
        });

        if (!result) return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (!result.products.includes(product_id)) return helper.response(res, 400, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);

        if (data) {
            try {
                const field = JSON.parse(helper.convertToJSON(data));
                const keys = Object.keys(field);
                const values = Object.values(field);
                if (keys.some(f => ['status', 'release_date'].includes(f))) {
                    return helper.response(res, 403, false, errors[403]['403.field'].message, errors[403]['403.field'].code);
                }

                if (keys.some(f => ['like', 'interaction', 'stock'].includes(f)) && status !== 'approved') {
                    return helper.response(res, 403, false, errors[403]['403.update'].message.replace('{FIELD}', keys.join(', ')), errors[403]['403.update'].code);
                }

                await Promise.all(
                    keys.map(async (f, i) => {
                        f = String(f).replace(/\{|\}/g, '');
                        let dt = values[i];

                        if (['like', 'interaction'].includes(f)) {
                            dt = await new Promise<string>((resolve, reject) => {
                                db.getProduct(product_id, status, false, (rest: any, err: Error) => {
                                    if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                    if (f === 'like') {
                                        if (!dt || !['+', '-'].includes(dt as string)) return reject(helper.response(res, 400, false, "Field like harus bernilai + atau -", errors[400]['400.error'].code));
                                        if (dt === '+') { resolve(String(Number(rest[f]) + 1)); } else { resolve(String(Number(rest[f]) - 1)); }
                                    } else {
                                        resolve(String(Number(rest[f]) + 1));
                                    }
                                });
                            });
                        
                            await new Promise<void>((resolve, reject) => {
                                db.updateUserData(seller_id, 'update', String(dt), `statistics.total_${f}`, (rest: any, err: Error) => {
                                    if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                    resolve();
                                });
                            });
                        }

                        if (['stock'].includes(f)) {
                            dt = await new Promise<string>((resolve, reject) => {
                                db.getProduct(product_id, status, false, (rest: any, err: Error) => {
                                    if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                    if (dt) { resolve(String(Number(rest[f]) + Number(dt))) } else { resolve(String(Number(rest[f]) - 1)) }
                                });
                            });
                        }

                        await new Promise<void>((resolve, reject) => {
                            db.updateProduct(product_id, status, dt, f, (rest: any, err: Error) => {
                                if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                if (!rest) return reject(helper.response(res, 404, false, errors[404]['404.product'].message, errors[404]['404.product'].code));
                                if (rest == 'not_found') return reject(helper.response(res, 404, false, `Field ${f} tidak ada data ini.`, errors[404]['404.error'].code));
                                if (rest == 'not_edited') return reject(helper.response(res, 404, false, `Tidak ada data yang diubah.`, errors[404]['404.error'].code));
                                resolve();
                            });
                        });
                    })
                );
            } catch (e) {
                return helper.response(res, 400, false, e, errors[400]['400.error'].code);
            }
        }

        if (act.includes('remove')) {
            const oldFileIDs = old_file_id.includes('[') ? old_file_id.replace(/\[|\]/g, '').split(',') : [old_file_id];

            await Promise.all(
                oldFileIDs.map(async (file_id) => {
                    await new Promise<void>((resolve, reject) => {
                        db.removeFromDrive(file_id, (rests: any, err: Error) => {
                            resolve();
                        });
                    });

                    await new Promise<void>((resolve, reject) => {
                        db.updateProductImage(product_id, status, 'remove', file_id, null, null, (rest: any, err: Error) => {
                            if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                            if (!rest) return reject(helper.response(res, 404, false, `Sesuatu tidak ada pada tempatnya.`, errors[404]['404.error'].code));
                            resolve();
                        });
                    });
                })
            );
        }

        if (files.length > 0) {
            const uploadResults = await Promise.all(
                files.map(file =>
                    new Promise<any>((resolve, reject) => {
                        db.addToDrive(file, null, 'product', (driveResult: any, err: Error) => {
                            resolve(driveResult);
                        });
                    })
                )
            );

            if (act.includes('add')) {
                await Promise.all(
                    uploadResults.map(result =>
                        new Promise<void>((resolve, reject) => {
                            db.updateProductImage(product_id, status, 'add', null, result.file_id, result.file_name, (rest: any, err: Error) => {
                                if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                resolve();
                            });
                        })
                    )
                );
            } else if (act.includes('update')) {
                const oldFileIDs = old_file_id.includes('[') ? old_file_id.replace(/\[|\]/g, '').split(',') : [old_file_id];

                await Promise.all(
                    oldFileIDs.map(async (file, i) => {
                        await new Promise<void>((resolve, reject) => {
                            db.removeFromDrive(file, (rests: any, err: Error) => {
                                resolve();
                            });
                        });

                        await new Promise<void>((resolve, reject) => {
                            db.updateProductImage(product_id, status, 'update', file, uploadResults[i].file_id, uploadResults[i].file_name, (rest: any, err: Error) => {
                                if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                resolve();
                            });
                        });
                    })
                );
            }
        }

        return helper.response(res, 200, true, 'Berhasil!', null, { product_id });
    } catch {
        return;
    }
};

export const productRemove = (req: ProductRemoveRequest, res: Response): Response | void => {
    const { seller_id, status, product_id }: { seller_id: string; status: string; product_id: string } = req.body;

    if (!helper.detectParam(seller_id, status, product_id)) {
        return helper.response(
            res, 400, false,
            errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `seller_id, status, product_id`),
            errors[400]['400.parameter'].code
        );
    }

    db.getUserData(seller_id, (result: any, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        if (!result.products.includes(product_id)) {
            return helper.response(res, 404, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);
        }

        db.getProduct(product_id, status, false, (rest: any, err: Error) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!rest) return helper.response(res, 404, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

            const removePromises = rest.images.map((rts: { file_id: string }) => {
                return new Promise((resolve) => {
                    db.removeFromDrive(rts.file_id, (rr: any, err: Error) => {
                        resolve(rr);
                    });
                });
            });

            Promise.all(removePromises).then(() => {
                db.removeProduct(seller_id, status, product_id, (rest: any, err: Error) => {
                    if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
                    if (!rest) return helper.response(res, 404, false, errors[404]['404.product'].message, errors[404]['404.product'].code);

                    return helper.response(res, 200, true, 'Produk dihapus!');
                });
            }).catch((err) => helper.response(res, 400, false, err, errors[400]['400.error'].code));
        });
    });
};

/**
 * Endpoint untuk mendapatkan ringkasan produk.
 */
export const productSummary = (req: ProductSummaryRequest, res: Response): Response | void => {
    const { limit } = req.body;

    if ((limit && String(limit) === '' )|| (limit && limit < 0)) {
        return helper.response(res, 400, false, 'Jika Anda menggunakan parameter ini, maka nilai tidak boleh kosong dan parameter limit tidak boleh kurang dari 0.', errors[400]['400.error'].code);
    }

    db.getAllProduct('approved', null, async (rest: any, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!rest) return helper.response(res, 404, false, errors[404]['404.no_product'].message, errors[404]['404.no_product'].code);

        if (!Array.isArray(rest)) return helper.response(res, 400, false, "Data format error", errors[400]['400.error'].code);

        const sortProduct = await helper.sortedProduct(rest,limit ?? 20);
        if (!sortProduct) return helper.response(res, 400, false, `Tidak ada produk saat ini.`, errors[400]['400.error'].code);

        return helper.response(res, 200, true, `Nanti kalau mau nampilin halaman produk, ambil product_id nya lalu verifikasi ke /verify/product, biar viewnya nambah.`, null, sortProduct);
    });
};

/**
 * Endpoint untuk mencari produk.
 */
export const productSearch = (req: ProductSearchRequest, res: Response): Response | void => {
    const { query, category } = req.body;
    if (query && query === '') {
        return helper.response(res, 400, false, `Jika Anda menggunakan query, maka query tidak boleh kosong.`, errors[400]['400.error'].code);
    }

    if (category && category === '') {
        return helper.response(res, 400, false, `Jika Anda menggunakan category, maka category tidak boleh kosong.`, errors[400]['400.error'].code);
    }

    db.getAllProduct('approved', null, async (rest: any[], err: any) => {
        if (err) {
            return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        }
        if (!rest) {
            return helper.response(res, 404, false, errors[404]['404.no_product'].message, errors[404]['404.no_product'].code);
        }

        const search = helper.searchProduct(rest, query, category);
        if (search.length > 0) {
            const productList = await Promise.all(search.map(async (product) => {
                const sellerName = await new Promise<string>((resolve) => {
                    db.getUserData(product.seller.seller_id, (result: any, err: Error) => {
                        if (err || !result) return resolve('N/A');
                        resolve(result.name);
                    });
                });

                return helper.productInject(product, sellerName);
            }))

            return helper.response(res, 200, true, `Nanti kalau mau nampilin halaman produk, ambil product_id nya lalu verifikasi ke /verify/product, biar viewnya nambah.`, null, productList);
        } else {
            const sortProduct = await helper.sortedProduct(rest, 20);
            if (!sortProduct) {
                return helper.response(res, 400, false, `Tidak ada produk saat ini.`, errors[400]['400.error'].code);
            }

            return helper.response(res, 200, true, `Nanti kalau mau nampilin halaman produk, ambil product_id nya lalu verifikasi ke /verify/product, biar viewnya nambah.`, null, sortProduct);
        }
    });
};
