import { Request, Response } from 'express';
import * as errors from '../../data/error.json';
import * as helper from '../../components/helper/helper';
import * as db from '../../components/database/db';

type Instance = 'Guru' | 'Siswa' | 'Departemen' | 'Lainnya';

interface AuthSignupRequest extends Request {
    body: {
        name: string;
        email: string;
        instance?: Instance;
        whatsapp?: string;
        password: string;
        asal_sekolah: string;
        jurusan: string;
    }
}

interface AuthSigninRequest extends Request {
    body: {
        email: string;
        password: string;
    }
}

interface AuthSignoutRequest extends Request {
    body: {
        access_token: string;
    }
}

/**
 * Endpoint untuk mendaftarkan pengguna baru.
 */
export const authSignup = async (req: AuthSignupRequest, res: Response): Promise<void> => {
    const { name, email, instance, whatsapp, password, asal_sekolah, jurusan } = req.body;
    const file = (req as any).file;

    if (!helper.detectParam(name, email, password)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `name, email, password`), errors[400]['400.parameter'].code);
    }

    const uploadResult: any = await new Promise((resolve, reject) => {
        db.addToDrive(file, null, 'profile', (result: any, err: Error) => {
            if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
            resolve(result);
        });
    });

    await new Promise<void>((resolve, reject) => {
        db.addUser(name, instance, whatsapp, email, password, `${process.env.GOOGLE_DRIVE_URL}${uploadResult.file_id}`, asal_sekolah, jurusan, (result: any, err: Error) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!result) return helper.response(res, 400, false, errors[400]['400.available'].message, errors[400]['400.available'].code);
    
            const accessToken = helper.generateKey({ id: result });
            db.saveAccessToken(accessToken, result);
            return helper.response(res, 200, true, `Berhasil!`, null, { access_token: accessToken });
        });
    });
};

/**
 * Endpoint untuk login pengguna.
 */
export const authSignin = (req: AuthSigninRequest, res: Response): void => {
    const { email, password } = req.body;
    if (!helper.detectParam(email, password)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `email, password`), errors[400]['400.parameter'].code);
    }

    db.getUserData(email, (result: any, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

        helper.pwd('dec', password, result.password, (isValid: boolean, err: Error) => {
            if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
            if (!isValid) return helper.response(res, 401, false, errors[401]['401.password'].message, errors[401]['401.password'].code);

            const accessToken = helper.generateKey({ id: result.id });
            db.saveAccessToken(accessToken, result.id);
            return helper.response(res, 200, true, `Berhasil!`, null, { access_token: accessToken });
        });
    });
};

/**
 * Endpoint untuk menghapus token akses.
 */
export const authSignout = (req: AuthSignoutRequest, res: Response): void => {
    const { access_token } = req.body;
    if (!helper.detectParam(access_token)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `access_token`), errors[400]['400.parameter'].code);
    }

    db.removeAccessToken(access_token, (result: boolean, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 401, false, errors[401]['401.jwt'].message, errors[401]['401.jwt'].code);

        return helper.response(res, 200, true, `Berhasil!`);
    });
};