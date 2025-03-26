import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import errors from '../../data/error.json';
import * as helper from '../../components/helper/helper';
import * as db from '../../components/database/db';
import { Request, Response } from 'express';

type ProductStatus = 'approved' | 'rejected' | 'pendings';

interface VerifyTokenRequest extends Request {
    body: {
        access_token: string;
    }
}

interface VerifyProductRequest extends Request {
    body: {
        product_id: string;
        seller_id?: string;
        email?: string;
        status?: ProductStatus;
    }
}

interface VerifyAccountRequest extends Request {
    body: {
        account_id?: string;
        email?: string;
    }
}

/**
 * Endpoint untuk memverifikasi token akses dan mendapatkan informasi pengguna.
 */
export const verifyToken = (req: VerifyTokenRequest, res: Response): Response | void => {
    const { access_token }: { access_token?: string } = req.body;
    
    if (!access_token || !helper.detectParam(access_token)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `access_token`), errors[400]['400.parameter'].code);
    }

    db.getAccessToken(access_token, (result: any, err: Error) => {
        if (err) {
            return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        }
        if (!result) {
            return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);
        }

        const hsl = helper.decodeKey(access_token) as any;
        if (!hsl || hsl === 'expired') {
            db.removeAccessToken(access_token, null);
            return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);
        }

        db.getUserData(hsl.id, (result: any, err: Error) => {
            if (err) {
                return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            }
            if (!result) {
                return helper.response(res, 404, false, errors[404]['404.jwt'].message, errors[404]['404.jwt'].code);
            }

            if (result.profile_photo == null) {
                result.profile_photo = `${process.env.GOOGLE_DRIVE_URL}${process.env.PROFILE_EMPTY}`;
            }
            
            return helper.response(res, 200, true, `Berhasil!`, null, result);
        });
    });
};

/**
 * Endpoint untuk memverifikasi produk.
 */
export const verifyProduct = (req: VerifyProductRequest, res: Response): Response | void => {
    const { product_id, seller_id, email, status } = req.body;

    if (!helper.detectParam(product_id)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `product_id`), errors[400]['400.parameter'].code);
    }

    if ((!seller_id || seller_id === '') && (!email || email === '')) {
        return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter seller_id atau email.', errors[400]['400.error'].code);
    }

    if (seller_id && seller_id === '') {
        return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `seller_id`), errors[400]['400.opt_param'].code);
    }

    if (email && email === '') {
        return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `email`), errors[400]['400.opt_param'].code);
    }

    if (status && !['approved', 'rejected', 'pendings'].includes(status)) {
        return helper.response(res, 400, false, 'Parameter status hanya bisa "approved", "rejected" dan "pendings".', errors[400]['400.error'].code);
    }

    const ident: string = email || seller_id;

    db.getUserData(ident, (result: any, err: Error) => {
        if (err) {
            return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        }
        if (!result) {
            return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        }
        if (!result.products.includes(product_id)) {
            return helper.response(res, 404, false, errors[404]['404.user_product'].message, errors[404]['404.user_product'].code);
        }
        const st = (status) ? false : true;

        db.getProduct(product_id, status, st, (rest: any, err: Error) => {
            if (err) {
                return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            }
            if (!rest) {
                return helper.response(res, 404, false, errors[404]['404.product'].message, errors[404]['404.product'].code);
            }

            if (rest.status === 'approved') {
                rest.view = Number(rest.view) + 1;
                db.updateProduct(product_id, 'approved', rest.view, 'view', null);
            }

            return helper.response(res, 200, true, `Berhasil!`, null, helper.productInject(rest, result.name));
        });
    });
};

/**
 * Endpoint untuk mendapatkan informasi akun (tanpa field password).
 */
export const verifyAccount = (req: VerifyAccountRequest, res: Response): Response | void => {
    const { account_id, email }: { account_id?: string; email?: string } = req.body;

    if ((!account_id || account_id === '') && (!email || email === '')) {
        return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter account_id atau email.', errors[400]['400.error'].code);
    }

    if (account_id && account_id === '') {
        return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `account_id`), errors[400]['400.opt_param'].code);
    }

    if (email && email === '') {
        return helper.response(res, 400, false, errors[400]['400.opt_param'].message.replace(`{PARAMETER}`, `email`), errors[400]['400.opt_param'].code);
    }

    const ident: string = email || account_id;

    db.getUserData(ident, (result: any, err: Error) => {
        if (err) {
            return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        }
        if (!result) {
            return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);
        }

        if (result.profile_photo == null) {
            result.profile_photo = `${process.env.GOOGLE_DRIVE_URL}${process.env.PROFILE_EMPTY}`;
        }

        const obj = JSON.stringify(result, (key, value) => (key === 'password' ? undefined : value));

        return helper.response(res, 200, true, `Berhasil!`, null, JSON.parse(obj));
    });
};