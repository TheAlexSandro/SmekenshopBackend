import { Request, Response } from 'express';
import * as helper from '../../components/helper/helper';
import * as db from '../../components/database/db';
import * as errors from '../../data/error.json';

type Action = 'update' | 'remove';
type Role = 'admin' | 'user';

interface UpdateAccountRequest extends Request {
    body: {
        server_id: string;
        id?: string;
        email?: string;
        data?: string;
        action?: Action;
        password?: string;
    }
}

interface UpdateRoleRequest extends Request {
    body: {
        id: string;
        role: Role;
    }
}

/**
 * Endpoint untuk mengupdate data pengguna.
 */
export const updateAccount = async (req: UpdateAccountRequest, res: Response): Promise<Response | void> => {
    const { server_id, id, email, data, action, password } = req.body;
    const files = (req as any).file;

    if (!helper.detectParam(server_id)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `server_id`), errors[400]['400.parameter'].code);
    }

    if (server_id !== process.env.SERVER_ID) {
        return helper.response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);
    }

    if ((!id && !email) || id === '' || email === '') {
        return helper.response(res, 400, false, 'Membutuhkan nilai pada parameter id atau email.', errors[400]['400.error'].code);
    }

    if (files && !['update', 'remove'].includes(action)) {
        return helper.response(res, 400, false, 'Parameter action hanya bisa "update" atau "remove".', errors[400]['400.error'].code);
    }

    if (action === 'update' && !files) {
        return helper.response(res, 400, false, errors[400]['400.missing_file'].message, errors[400]['400.missing_file'].code);
    }

    const ident: string = email ?? id;

    try {
        if (data) {
            const field = JSON.parse(helper.convertToJSON(data));
            const keys = Object.keys(field);
            const values = Object.values(field);
            if (keys.some(f => ['id', 'role'].includes(f))) {
                return helper.response(res, 403, false, errors[403]['403.field'].message, errors[403]['403.field'].code);
            }

            if (keys.some(f => ['password'].includes(f))) {
                if (!password) return helper.response(res, 400, false, 'Membutuhkan parameter password jika ingin memperbarui kata sandi', errors[400]['400.error'].code);
            
                await new Promise<any>((resolve, reject) => {
                    db.getUserData(ident, (resData: any, err: Error) => {
                        if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                        if (!resData) return reject(helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code));
                        
                        helper.pwd('dec', password, resData.password, (isValid: boolean, err: Error) => {
                            if (!isValid) return reject(helper.response(res, 401, false, errors[401]['401.password'].message, errors[401]['401.password'].code));
                            resolve(resData);
                        });
                    });
                });
            }

            await Promise.all(keys.map(async(f: string, i: number) => {
                f = String(f).replace(/\{|\}/g, '');
                let dt = values[i];

                if (f === 'interaction') {
                    dt = await new Promise<string>((resolve, reject) => {
                        db.getUserData(ident, (result: any, err: Error) => {
                            if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                            resolve(String(Number(result[f]) + 1));
                            if (!result) return reject(helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code));
                        });
                    });
                }

                if (f === 'password') {
                    dt = await new Promise<string>((resolve, reject) => {
                        helper.pwd('enc', dt as string, process.env.PASSWORD_SALT, (result: string, err: Error) => {
                            resolve(result);
                        });
                    });
                }

                return new Promise<void>((resolve, reject) => {
                    db.updateUserData(ident, 'update', dt, f, (result: any, err: Error) => {
                        if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                        if (!result) return reject(helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code));
                        if (result == 'not_found') return reject(helper.response(res, 404, false, `Field ${f} tidak ditemukan di database.`, errors[400]['400.error'].code));
                        resolve();
                    });
                });
            }));
        }

        if (action === 'remove') {
            const result: any = await new Promise((resolve, reject) => {
                db.getUserData(ident, (result: any, err: Error) => {
                    if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                    if (!result) return reject(helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code));
                    resolve(result);
                });
            });

            if (result.profile_photo) {
                const match = result.profile_photo.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
                if (match) {
                    await new Promise<void>((resolve, reject) => {
                        db.removeFromDrive(match[1], () => {
                            db.updateUserData(ident, 'remove', null, 'profile_photo', (updateResult: any, err: Error) => {
                                if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                                resolve();
                            });
                        });
                    });
                }
            }
        }

        if (files && action === 'update') {
            const uploadResult: any = await new Promise((resolve, reject) => {
                db.addToDrive(files, null, 'profile', (result: any, err: Error) => {
                    if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                    resolve(result);
                });
            });

            await new Promise<void>((resolve, reject) => {
                db.updateUserData(ident, 'update', `${process.env.GOOGLE_DRIVE_URL}${uploadResult.file_id}`, 'profile_photo', (updateResult: any, err: Error) => {
                    if (err) return reject(helper.response(res, 400, false, err, errors[400]['400.error'].code));
                    resolve();
                });
            });
        }

        if (!data && !files && !action) {
            return helper.response(res, 400, false, 'Tidak ada data yang diperbarui.', errors[400]['400.error'].code);
        }

        return helper.response(res, 200, true, `Berhasil!`, null, { id, email });
    } catch (error) {
        return;
    }
};

/**
 * Endpoint untuk mengupdate peran pengguna.
 */
export const updateRole = (req: UpdateRoleRequest, res: Response): Response | void => {
    const { id, role } = req.body;

    if (!helper.detectParam(id, role)) {
        return helper.response(res, 400, false, errors[400]['400.parameter'].message.replace(`{PARAMETER}`, `id, role`), errors[400]['400.parameter'].code);
    }

    if (!['admin', 'user'].includes(role)) {
        return helper.response(res, 400, false, 'Parameter role hanya bisa "admin" atau "user".', errors[400]['400.error'].code);
    }

    db.updateUserData(id, 'update', role, 'role', (result: any, err: Error) => {
        if (err) return helper.response(res, 400, false, err, errors[400]['400.error'].code);
        if (!result) return helper.response(res, 404, false, errors[404]['404.user'].message, errors[404]['404.user'].code);

        return helper.response(res, 200, true, `Berhasill mengganti peran pengguna ini ke ${role}!`, null, { id });
    });
}
