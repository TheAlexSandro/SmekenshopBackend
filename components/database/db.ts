import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, CollectionReference, DocumentData, QuerySnapshot, FieldValue, WriteResult } from "firebase-admin/firestore";
import { google } from "googleapis";
import stream from "stream";
import * as helper from "../helper/helper";
import creds from "../../firebase-cred.json";

initializeApp({
    credential: cert(creds as ServiceAccount),
});

const db = getFirestore();
const dbs = <T>(collection: T) => db.collection(collection as string) as CollectionReference<DocumentData>;

const users = dbs("users");
const products = dbs("products");
const pendings = dbs("pendings");
const rejected = dbs("rejected");
const tokens = dbs("tokens");

interface UserData {
    role: string;
    id: string;
    name: string;
    instance?: string | null;
    whatsapp?: string | null;
    interaction: string;
    email: string;
    password: string;
    profile_photo?: string | null;
    products: string[];
    statistics: {
        total_like: string,
        total_interaction: string,
    }
}

interface ProductData {
    status: string;
    product_id: string;
    product_name: string;
    description: string;
    price: string;
    category: string;
    images: string[];
    like: string;
    view: string;
    interaction: string;
    release_date: string;
    seller: {
        seller_id: string;
    },
    message: string | null;
}

interface FileObject {
    buffer: Buffer;
    mimetype: string;
}

type ImageType = {
    file_id: string;
    file_name: string;
};

type DriveCallback = (result: { file_id: string; file_name: string } | null, error?: Error) => void;
type UserCallback<T> = (result: T, error?: Error) => void;

const addUser = (name: string, instance: string | null = null, whatsapp: string | null = null, email: string, password: string, profile_photo: string | null, callback: UserCallback<string | false>): void => {
    const profile = profile_photo || null;

    getUserData(email, (result: UserData | null, err?: Error) => {
        if (err) return callback(null, err);
        if (!result) {
            const id = helper.createID(5);

            helper.pwd("enc", password, null, (hashedPassword: string, err?: Error) => {
                if (err) return callback(false, err);

                const userData: UserData = {
                    role: 'user',
                    id,
                    name,
                    instance,
                    whatsapp,
                    interaction: "0",
                    email,
                    password: hashedPassword,
                    profile_photo: profile,
                    products: [],
                    statistics: {
                        total_like: "0",
                        total_interaction: "0",
                    }
                };

                users.doc(id).set(userData);
                callback(id);
            });
        } else {
            callback(false);
        }
    });
};

const getUserData = (ident: string, callback: UserCallback<UserData | false>): void => {
    if (ident.includes("@")) {
        users
            .where("email", "==", ident)
            .get()
            .then((snapshot: QuerySnapshot<DocumentData>) => {
                if (snapshot.empty) {
                    callback(false);
                } else {
                    callback(snapshot.docs[0].data() as UserData);
                }
            })
            .catch((error: Error) => {
                callback(null, error);
            });
    } else {
        users
            .doc(ident)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    callback(doc.data() as UserData);
                } else {
                    callback(false);
                }
            })
            .catch((error: Error) => {
                callback(null, error);
            });
    }
};

const updateUserData = (ident: string, action: "update" | "remove", value: any = null, field: string, callback: UserCallback<boolean | "not_found">): void => {
    if (action === "remove") {
        value = null;
    }

    getUserData(ident, (rest, err) => {
        if (err) {
            return callback(null, err);
        }

        if (!rest) {
            return callback(false);
        }

        const hasNestedProperty = (obj: any, path: string) => {
            return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : undefined), obj) !== undefined;
        };

        if (!hasNestedProperty(rest, field)) {
            return callback("not_found");
        }

        users
            .doc(rest.id)
            .update({ [field]: value })
            .then(() => callback(true))
            .catch((error: Error) => callback(null, error));
    });
};

const updateUserProducts = (id: string, action: "add" | "remove", product_id: string, callback?: UserCallback<boolean>): void => {
    const updateValue =
        action === "add"
            ? FieldValue.arrayUnion(product_id)
            : FieldValue.arrayRemove(product_id);

    users
        .doc(id)
        .update({ products: updateValue })
        .then(() => callback?.(true))
        .catch((error) => callback?.(null, error));
};

// Simpan token
const saveAccessToken = (token: string, id: string): Promise<WriteResult> => {
    return tokens.doc(token).set({
        token, id
    })
}

const getAccessToken = (token: string, callback: UserCallback<DocumentData | false>): void => {
    tokens
        .doc(token)
        .get()
        .then((doc) => {
            if (!doc.exists) return callback(false);
            return callback(doc.data() || false);
        })
        .catch((error) => callback(false, error));
};

const removeAccessToken = (token: string, callback?: UserCallback<boolean>): void => {
    getAccessToken(token, (rest, err) => {
        if (callback) {
            if (err) return callback(null, err);
            if (!rest) return callback(false);
        }

        tokens
            .doc(token)
            .delete()
            .then(() => callback?.(true))
            .catch((error) => callback?.(null, error));
    });
};

// FILE
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const addToDrive = (fileObject: FileObject, file_name: string | null, type: string, callback: DriveCallback): void => {
    const ids = helper.createID(20);
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);

    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    drive.files
        .create({
            requestBody: {
                name: file_name || `${type}-${ids}`,
            },
            media: {
                mimeType: fileObject.mimetype,
                body: bufferStream,
            },
            fields: "id",
        })
        .then((fileResponse) => {
            const fileId = fileResponse.data.id;

            if (!fileId) {
                return callback(null, new Error("File ID tidak ditemukan"));
            }

            return drive.permissions
                .create({
                    fileId,
                    requestBody: {
                        role: "reader",
                        type: "anyone",
                    },
                })
                .then(() => {
                    callback({ file_id: fileId, file_name: file_name || `${type}-${ids}` });
                });
        })
        .catch((err) => {
            callback(null, err);
        });
};

const removeFromDrive = (file_id: string, callback: UserCallback<Boolean>): void => {
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    drive.files
        .delete({ fileId: file_id })
        .then(() => callback(true))
        .catch((err) => callback(null, err));
};


const addProduct = (product_id: string | null = null, product_name: string, description: string, price: string, category: string, images: string[], seller_id: string, callback: UserCallback<string>): void => {
    product_id = (product_id) ? product_id : helper.createID(10);
    const dates: string = helper.getDate();

    const fileData: ProductData = {
        status: 'pending',
        product_id,
        product_name,
        description,
        price,
        category,
        images,
        like: "0",
        view: "0",
        interaction: "0",
        release_date: dates,
        seller: { seller_id },
        message: null
    };

    pendings
        .doc(product_id)
        .set(fileData)
        .then(() => callback(product_id))
        .catch((e) => callback(null, e));
};

const reviewProduct = (product_id: string, product_name: string, description: string, price: string | number, category: string, images: string[], seller_id: string, like: number, view: number, interaction: number, release_date: string, action: "approve" | "reject", message: string | null = null, callback: UserCallback<boolean>): void => {
    const status = (action === "approve") ? 'approved' : 'rejected';
    const m = (action === "approve") ? null : message;
    const fileData = {
        status,
        product_id,
        product_name,
        description,
        price,
        category,
        images,
        like,
        view,
        interaction,
        release_date,
        seller: { seller_id },
        message: m
    }

    if (action === "approve") {
        products
            .doc(product_id)
            .set(fileData)
            .then(() => callback(true))
            .catch((e) => callback(null, e));
        rejected
            .doc(product_id)
            .delete();
        pendings
            .doc(product_id)
            .delete();
    } else if (action === "reject") {
        rejected
            .doc(product_id)
            .set(fileData)
            .then(() => callback(true))
            .catch((e) => callback(null, e));
        pendings
            .doc(product_id)
            .delete();
    }
};

const getProduct = (product_id: string, status: string, global: boolean = false, callback: UserCallback<DocumentData | false>): void => {
    if (!global) {
        const docRef = (status == 'approved') ? products.doc(product_id) : (status == 'rejected') ? rejected.doc(product_id) : pendings.doc(product_id);

        docRef.get().then(r => {
            if (!r.exists) return callback(false);
            return callback(r.data());
        }).catch((e) => callback(null, e));
    } else {
        const collections = ["pendings", "product", "rejected"];
        const searchPromises = collections.map(collection =>
            db.collection(collection).doc(product_id).get().then(doc => doc.exists ? doc.data() : null)
        );

        Promise.all(searchPromises)
            .then(results => {
                const found = results.find(result => result !== null);
                callback(found ?? false);
            })
            .catch(error => {
                callback(null, error);
            });
    }
};

const getAllProduct = (status: string, seller_id: string | null = null, callback: UserCallback<DocumentData[] | false>): void => {
    const docRef = (status == 'approved') ? products : (status == 'rejected') ? rejected : pendings;

    if (seller_id) {
        docRef.where("seller.seller_id", "==", seller_id).get().then((r) => {
            if (r.empty) return callback(false);

            const productList: FirebaseFirestore.DocumentData[] = [];
            r.docs.map((doc) => {
                productList.push(doc.data());
            });

            return callback(productList);
        })
            .catch((e) => {
                return callback(null, e);
            })
    } else {
        docRef.get().then((r) => {
            if (r.empty) return callback(false);

            const productList: FirebaseFirestore.DocumentData[] = [];
            r.docs.map((doc) => {
                productList.push(doc.data());
            });

            return callback(productList);
        })
            .catch((e) => {
                return callback(null, e);
            });
    }
};

const updateProduct = (product_id: string, status: string, value: any, field: string, callback: UserCallback<string | "not_found" | boolean>): void => {
    getProduct(product_id, status, false, (rests, err) => {
        if (err) {
            if (callback) return callback(null, err);
            return;
        }

        if (!rests) {
            if (callback) return callback(false);
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(rests, field)) {
            if (callback) return callback("not_found");
            return;
        }

        if (field === "images") {
            value = [];
        }

        const docRef = (status == 'approved') ? products.doc(product_id) : (status == 'rejected') ? rejected.doc(product_id) : pendings.doc(product_id);

        docRef.update({ [field]: value }).then(() => callback(product_id)).catch((e) => callback(null, e));
    });
};

const updateProductImage = (product_id: string, status: string, action: "update" | "add" | "remove", file_id: string | null, newFileId: string | null = null, newFileName: string | null = null, callback: UserCallback<boolean>): Promise<void> => {
    const docRef = (status == 'approved') ? products.doc(product_id) : (status == 'rejected') ? rejected.doc(product_id) : pendings.doc(product_id);

    return db.runTransaction((transaction) => {
        return transaction.get(docRef).then((doc) => {
            if (!doc.exists) {
                callback(false);
            }

            const data = doc.data();
            if (!data || !Array.isArray(data.images)) {
                callback(false);
            }

            let updatedImages: ImageType[];

            if (action === "update") {
                updatedImages = data.images.map((image: ImageType) =>
                    image.file_id === file_id
                        ? {
                            ...image,
                            file_id: newFileId || image.file_id,
                            file_name: newFileName || image.file_name,
                        }
                        : image
                );
            } else if (action === "add") {
                updatedImages = [...data.images, { file_id: newFileId, file_name: newFileName }];
            } else if (action === "remove") {
                updatedImages = data.images.filter((image: ImageType) => image.file_id !== file_id);
            }

            transaction.update(docRef, { images: updatedImages });
            return Promise.resolve();
        });
    })
        .then(() => {
            callback(true);
        })
        .catch((error) => {
            callback(null, error)
        });
};

const removeProduct = (seller_id: string, status: string, product_id: string, callback: UserCallback<boolean>): void => {
    const docRef = (status == 'approved') ? products.doc(product_id) : (status == 'rejected') ? rejected.doc(product_id) : pendings.doc(product_id);

    docRef.delete().then(() => {
        updateUserProducts(seller_id, "remove", product_id, (res, err) => {
            if (err) return callback(null, err);
            callback(true);
        });
    }).catch((error) => callback(null, error));
};

export {
    addUser,
    getUserData,
    saveAccessToken,
    getAccessToken,
    removeAccessToken,
    addProduct,
    getProduct,
    getAllProduct,
    addToDrive,
    removeFromDrive,
    updateUserData,
    updateProduct,
    updateProductImage,
    updateUserProducts,
    removeProduct,
    reviewProduct
};