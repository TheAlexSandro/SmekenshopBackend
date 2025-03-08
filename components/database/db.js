require('dotenv').config({ path: '.env' })
const firebase = require('firebase-admin');
const creds = require('../../firebase-cred.json')
const helper = require('../helper/helper');
const { google } = require('googleapis');
const stream = require('stream');

firebase.initializeApp({
    credential: firebase.credential.cert(creds)
})
const db = firebase.firestore();
const users = db.collection('users');
const products = db.collection('products');
const tokens = db.collection('tokens');

const addUser = (name, instance = null, whatsapp = null, email, password, profile_photo, callback) => {
    const profile = profile_photo ? profile_photo : null;
    getUserData(email, (result, err) => {
        if (err) return callback(null, err);
        if (!result) {
            const id = helper.createID(5);

            helper.pwd('enc', password, null, (r, err) => {
                if (err) return callback(err);
                var userData = {
                    id, name, instance, whatsapp, interactions: 0, email, password: r, profile_photo: profile, products: []
                };

                users.doc(id).set(userData);
                callback(id);
            });
        } else {
            callback(false);
        }
    })
}

const getUserData = (ident, callback) => {
    if (String(ident).includes('@')) {
        return users.where('email', '==', ident).get().then(r => {
            if (r.empty) {
                callback(false);
            } else {
                callback(r.docs[0].data());
            }
        }).catch(e => {
            callback(null, e);
        })
    } else {
        return users.doc(ident).get().then(r => {
            if (r.exists) {
                callback(r.data());
            } else {
                callback(false);
            }
        }).catch(e => {
            callback(null, e);
        })
    }
}

const updateUserData = (ident, action, value = null, field, callback) => {
    if (action == 'remove') { value = null };
    getUserData(ident, (rest, err) => {
        if (err) return callback(null, err);
        return users.doc(rest.id).update({
            [field]: value
        }).then(() => {
            return callback(true);
        }).catch(e => {
            return callback(null, e);
        })
    })
};

const updateUserProducts = (id, action, product_id, callback = null) => {
    if (action == 'add') { var f = firebase.firestore.FieldValue.arrayUnion(product_id) } else { var f = firebase.firestore.FieldValue.arrayRemove(product_id) }
    return users.doc(id).update({
        products: f
    }).then(() => {
        return callback(true);
    }).catch(e => {
        return callback(null, e);
    })
};

// Simpan token
const saveAccessToken = (token, id) => {
    return tokens.doc(token).set({
        token, id
    })
}

const getAccessToken = (token, callback) => {
    return tokens.doc(token).get().then(r => {
        if (!r.exists) return callback(false);
        return callback(r.data());
    }).catch(e => {
        return callback(null, e);
    })
}

const removeAccessToken = (token, callback = null) => {
    getAccessToken(token, (rest, err) => {
        if (callback) { if (!rest) return callback(false); if (err) return callback(null, e); }
        tokens.doc(token).delete();
        if (callback) return callback(true);
    })
}

// FILE
const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const addToDrive = (fileObject, file_name, type, callback) => {
    const ids = helper.createID(20);
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    drive.files.create({
        requestBody: {
            name: (file_name) ? file_name : `${type}-${ids}`,
        },
        media: {
            mimeType: fileObject.mimetype,
            body: bufferStream,
        },
        fields: 'id',
    })
        .then(fileResponse => {
            const fileId = fileResponse.data.id;

            return drive.permissions.create({
                fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            })
                .then(() => {
                    callback({ file_id: fileId, file_name: (file_name) ? file_name : `${type}-${ids}` }, null);
                });
        })
        .catch(err => {
            callback(null, err);
        });
}

const removeFromDrive = (file_id, callback) => {
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    drive.files.delete({
        fileId: file_id
    }).then(() => {
        callback(true);
    }).catch(err => {
        callback(null, err);
    })
}

const addProduct = (product_name, description, price, category, images, seller_id, callback) => {
    const prices = String(price).includes(',') ? String(price).replace(/,/g, '.') : price;
    const product_id = helper.createID(10);
    const dates = helper.getDate();

    const fileData = {
        product_id,
        product_name,
        description,
        price: prices,
        category,
        images,
        like: 0,
        view: 0,
        interaction: 0,
        release_date: dates,
        seller: { seller_id }
    };

    return products.doc(product_id).set(fileData)
        .then(() => callback(product_id))
        .catch(e => callback(null, e));
};

const getProduct = (product_id, callback) => {
    products.doc(product_id).get().then(r => {
        if (r.exists) {
            return callback(r.data());
        } else {
            return callback(false);
        }
    }).catch(e => {
        return callback(null, e);
    })
}

const getAllProduct = (callback) => {
    products.get().then(r => {
        if (r.empty) return callback(false);
        let products = [];
        r.forEach(doc => {
            products.push({ ...doc.data() });
        });

        return callback(products);
    }).catch(e => {
        return callback(null, e);
    })
}

const updateProduct = (product_id, value, field, callback = null) => {
    getProduct(product_id, (rests, err) => {
        if (!rests.hasOwnProperty(field)) { if (callback) return callback('not_found') };
        if (field == 'images') { value = [] };
        products.doc(product_id).update({
            [field]: value
        }).then(() => {
            if (callback) return callback(product_id);
        }).catch(e => {
            if (callback) return callback(null, e);
        })
    })
};

const updateProductImage = (product_id, file_id = null, action, newFileId = null, newFileName = null, newLink = null, callback) => {
    const docRef = products.doc(product_id);

    return docRef.get()
        .then(doc => {
            if (!doc.exists) {
                throw new Error("Produk tidak ditemukan");
            }
            let data = doc.data();

            if (action == 'update') {
                var img = data.images.map(image =>
                    image.file_id === file_id
                        ? {
                            ...image,
                            file_id: newFileId || image.file_id,
                            file_name: newFileName || image.file_name,
                            link: newLink || image.link
                        }
                        : image
                );
            } else if (action == 'add') {
                var img = [...(data.images || []), { file_id: newFileId, file_name: newFileName, link: newLink }];
            } else {
                var img = data.images.filter(image => image.file_id !== file_id);
            }

            return docRef.update({ images: img });
        })
        .then(() => {
            return callback(true);
        })
        .catch(error => {
            return callback(null, error);
        });
}

const removeProduct = (seller_id, product_id, callback) => {
    products.doc(product_id).delete().then(() => {
        updateUserProducts(seller_id, 'rm', product_id);
        return callback(true);
    }).catch(e => {
        return callback(null, e);
    })
};


const dbs = {
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
    removeProduct
}
module.exports = dbs;