import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import mongoose, { HydratedDocument, Document } from "mongoose";
import * as helper from "../helper/helper";
import { google } from "googleapis";
import stream from "stream";

const uri = process.env.MONGODB_URI;
mongoose.connect(uri, {
    dbName: 'smekenshop'
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
    console.log("Connected to MongoDB");
});

const usersSchema = new mongoose.Schema({
    role: String,
    id: String,
    name: String,
    instance: { type: String, default: null },
    whatsapp: { type: String, default: null },
    interaction: String,
    email: String,
    password: String,
    profile_photo: { type: String, default: null },
    products: [String],
    statistics: {
        total_like: String,
        total_interaction: String,
    }
});

const productsSchema = new mongoose.Schema({
    status: String,
    product_id: String,
    product_name: String,
    description: String,
    price: String,
    category: String,
    images: [{
        file_id: String,
        file_name: String,
    }],
    like: String,
    view: String,
    interaction: String,
    release_date: String,
    seller: {
        seller_id: String,
    },
    message: { type: String, default: null },
    stock: String
});

const tokensSchema = new mongoose.Schema({
    id: String,
    token: String
});

interface UserData extends Document {
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

interface ProductData extends Document {
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
    strock: string,
}

interface TokenData extends Document {
    id: string,
    token: string;
}

const Users: mongoose.Model<UserData> = mongoose.model<UserData>("Users", usersSchema);
const Tokens: mongoose.Model<TokenData> = mongoose.model<TokenData>("Tokens", tokensSchema);
const Products: mongoose.Model<ProductData> = mongoose.model<ProductData>("Products", productsSchema);
const Rejected: mongoose.Model<ProductData> = mongoose.model<ProductData>("Rejected", productsSchema);
const Pendings: mongoose.Model<ProductData> = mongoose.model<ProductData>("Pendings", productsSchema);

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

const addUser = (name: string, instance: string | null = null, whatsapp: string | null = null, email: string, password: string, profile_photo: string | null, callback: UserCallback<string | false | null | Error>): void => {
    const profile = profile_photo || null;

    getUserData(email, (result: UserData | null, err?: Error) => {
        if (err) return callback(null, err);
        if (!result) {
            const id = helper.createID(5);

            helper.pwd("enc", password, null, (hashedPassword: string, err?: Error) => {
                if (err) return callback(false, err);

                const userData = new Users({
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
                    },
                });

                userData.save()
                    .then(() => callback(id))
                    .catch((error) => callback(false, error));
            });
        } else {
            callback(false);
        }
    });
};

const getUserData = (ident: string, callback: UserCallback<UserData | false | null | Error>): void => {
    const query = ident.includes("@") ? { email: ident } : { id: ident };

    Users.findOne(query)
        .then((user) => {
            if (user) {
                callback(user.toObject() as UserData);
            } else {
                callback(false);
            }
        })
        .catch((error: Error) => {
            callback(null, error);
        });
};

const updateUserData = (ident: string, action: "update" | "remove", value: any = null, field: string, callback: UserCallback<boolean | "not_found" | null | Error>): void => {
    if (action === "remove") {
        value = null;
    }

    getUserData(ident, (rest: UserData | null, err?: Error) => {
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

        Users.updateOne({ id: rest.id }, { $set: { [field]: value } })
            .then(() => callback(true))
            .catch((error: Error) => callback(null, error));
    });
};

const updateUserProducts = (id: string, action: "add" | "remove", product_id: string, callback?: UserCallback<boolean | null | Error>): void => {
    const updateQuery =
        action === "add"
            ? { $addToSet: { products: product_id } }
            : { $pull: { products: product_id } };

    Users.updateOne({ id }, updateQuery)
        .then(() => callback?.(true))
        .catch((error) => callback?.(null, error));
};

// Simpan token
const saveAccessToken = (token: string, id: string): Promise<void> => {
    const newToken = new Tokens({ token, id });
    return newToken.save().then(() => undefined);
};

const getAccessToken = (token: string, callback: UserCallback<TokenData | false | null>): void => {
    Tokens.findOne({ token })
        .then((doc) => {
            if (!doc) return callback(false);
            callback(doc.toObject() as TokenData);
        })
        .catch((error) => callback(null, error));
};

const removeAccessToken = (token: string, callback?: UserCallback<boolean | null | Error>): void => {
    getAccessToken(token, (rest, err) => {
        if (callback) {
            if (err) return callback(null, err);
            if (!rest) return callback(false);
        }

        Tokens.deleteOne({ token })
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

const removeFromDrive = (file_id: string, callback: UserCallback<Boolean | null | Error>): void => {
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    drive.files
        .delete({ fileId: file_id })
        .then(() => callback(true))
        .catch((err) => callback(null, err));
};


const addProduct = (product_id: string | null = null, product_name: string, description: string, price: string, category: string, images: string[], seller_id: string, stock: string, callback: UserCallback<string | null | Error>): void => {
    product_id = product_id ? product_id : helper.createID(10);
    const dates: string = helper.getDate();

    const fileData = new Pendings({
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
        message: null,
        stock
    });

    fileData
        .save()
        .then(() => callback(product_id))
        .catch((e) => callback(null, e));
};


const reviewProduct = (product_id: string, product_name: string, description: string, price: string | number, category: string, images: string[], seller_id: string, like: number, view: number, interaction: number, release_date: string, action: "approve" | "reject", message: string | null = null, stock: string, callback: UserCallback<boolean>): void => {
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
        message: m,
        stock
    }

    if (action === "approve") {
        Products.create(fileData)
            .then(() => callback(true))
            .catch((e) => callback(null, e));

        Rejected.deleteOne({ product_id }).exec();
        Pendings.deleteOne({ product_id }).exec();
    } else if (action === "reject") {
        Rejected.create(fileData)
            .then(() => callback(true))
            .catch((e) => callback(null, e));

        Pendings.deleteOne({ product_id }).exec();
    }
};

const getProduct = (product_id: string, status: string, global: boolean = false, callback: UserCallback<ProductData | false>): void => {
    if (!global) {
        const model: mongoose.Model<Document> = status === "approved"
            ? Products
            : status === "rejected"
                ? Rejected
                : Pendings;


        model.findOne({ product_id })
            .then(doc => {
                if (!doc) return callback(false);
                return callback(doc.toObject() as unknown as ProductData);
            })
            .catch((e) => callback(null, e));
    } else {
        const collections = [Pendings, Products, Rejected];
        const searchPromises = collections.map(model => model.findOne({ product_id }).exec());

        Promise.all(searchPromises)
            .then(results => {
                const found = results.find(result => result !== null);
                callback(found ? (found.toObject() as ProductData) : false);
            })
            .catch(error => {
                callback(null, error);
            });
    }
};


const getAllProduct = async (status: string, seller_id: string | null = null, callback: UserCallback<Document[] | false>): Promise<void> => {
    try {
        const model = status === "approved" ? Products : status === "rejected" ? Rejected : Pendings;
        let query = seller_id ? { "seller.seller_id": seller_id } : {};
        const products = await model.find(query).lean();

        if (products.length === 0) return callback(false);
        return callback(products as unknown as Document[]);
    } catch (error) {
        return callback(null, error);
    }
};


const updateProduct = async (product_id: string, status: string, value: any, field: string, callback: UserCallback<string | "not_found" | boolean>): Promise<void> => {
    try {
        getProduct(product_id, status, true, async (product: ProductData | false, err?: Error) => {
            if (err) return callback(null, err);
            if (!product) return callback(false);

            if (!Object.prototype.hasOwnProperty.call(product, field)) {
                return callback("not_found");
            }
    
            if (field === "images") {
                value = [];
            }
    
            const model = status === "approved" ? Products : status === "rejected" ? Rejected : Pendings;
            const updated = await model.updateOne({ product_id }, { [field]: value });
    
            if (updated.modifiedCount > 0) {
                return callback(product_id);
            } else {
                return callback('not_edited');
            }
        });
    } catch (error) {
        return callback(null, error);
    }
};

const updateProductImage = async (product_id: string, status: string, action: "update" | "add" | "remove", file_id: string | null, newFileId: string | null = null, newFileName: string | null = null, callback: UserCallback<boolean>): Promise<void> => {
    try {
        const model = status === "approved" ? Products : status === "rejected" ? Rejected : Pendings;
        const product = await model.findOne({ product_id });

        if (!product) return callback(false);
        if (!Array.isArray(product.images)) return callback(false);

        const images: ImageType[] = product.images as unknown as ImageType[];
        let updatedImages: ImageType[];
        let updated: any;

        if (action === "update") {
            updated = await model.updateOne(
                { product_id, "images.file_id": file_id },
                {
                    $set: {
                        "images.$.file_id": newFileId,
                        "images.$.file_name": newFileName
                    }
                }
            );        
        } else if (action === "add") {
            updated = await model.updateOne(
                { product_id },
                { $push: { images: { file_id: newFileId, file_name: newFileName } } }
            );

        } else if (action === "remove") {
            updated = await model.updateOne(
                { product_id },
                { $pull: { images: { file_id } } }
            );
        }

        if (updated.modifiedCount > 0) {
            return callback(true);
        } else {
            return callback(false);
        }
    } catch (error) {
        return callback(null, error);
    }
};

const removeProduct = (seller_id: string, status: string, product_id: string, callback: UserCallback<boolean>): void => {
    const model = status === "approved" ? Products 
                : status === "rejected" ? Rejected 
                : Pendings;

    model.findOneAndDelete({ product_id })
        .then((deletedProduct) => {
            if (!deletedProduct) {
                return callback(false);
            }

            updateUserProducts(seller_id, "remove", product_id, (res, err) => {
                if (err) return callback(null, err);
                callback(true);
            });
        })
        .catch((error) => callback(null, error));
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