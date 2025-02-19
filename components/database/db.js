require('dotenv').config({ path: '.env' })
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
const helper = require('../helper/helper');
const { google } = require('googleapis');
const stream = require('stream');
mongoose.connect(uri, { dbName: 'smekenshop' })
    .then(() => console.log('Successfully connected.'))
    .catch((err) => console.log('Failed to connect', err));

const Schema = mongoose.Schema;
const userSchema = new Schema({
    id: String,
    name: String,
    instance: String,
    whatsapp: String,
    interactions: String,
    email: String,
    password: {
        type: String,
        default: null
    },
    login_type: String,
    profile_photo: {
        type: String,
        default: null
    },
    products: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },
});
const User = mongoose.model('User', userSchema);

const addUser = (name, instance = null, whatsapp = null, email, login_type, password, profile_photo, callback) => {
    const profile = profile_photo ? profile_photo : null;
    User.findOne({ email }).then(result => {
        if (!result) {
            const id = helper.createID(5);

            if (login_type == 'form') {
                helper.pwd('enc', password, null, (r, err) => {
                    if (err) return callback(err);
                    var userData = new User({
                        id, name, instance, whatsapp, interactions: 0, email, password: r, login_type, profile_photo: profile, products: []
                    });
                    userData.save().then(() => callback(id)).catch(err => callback(null, err));
                });
            } else {
                var userData = new User({
                    id, name, instance, whatsapp, interactions: 0, email, password, login_type, profile_photo: profile, products: []
                });
                userData.save().then(() => callback(id)).catch(err => callback(null, err));
            }
        } else {
            callback(false);
        }
    }).catch(err => {
        callback(null, err);
    });
}

const getUserData = (identifier, callback) => {
    const ident = (identifier.includes('@')) ? { email: identifier } : { id: identifier };
    User.findOne(ident).select('-_id -__v').then(result => {
        if (!result) return callback(false);
        callback(result);
    }).catch(err => {
        console.log(err);
        callback(null, err);
    });
}

const updateUserData = (identifier, action, value, field, callback) => {
    const ident = identifier.includes('@') ? { email: identifier } : { id: identifier };

    User.findOne(ident)
        .then(result => {
            if (!result) return callback(false);
            const updateAction = {};

            if (action === 'set') {
                updateAction.$set = { [field]: value };
            } else if (action === 'push') {
                updateAction.$push = { [field]: value };
            } else if (action === 'pull') {
                updateAction.$pull = { [field]: value };
            } else if (action === 'unset') {
                updateAction.$set = { [field]: null };
            }

            User.updateOne(ident, updateAction)
                .then(() => callback(true))
                .catch(err => callback(err));
        })
        .catch(err => {
            console.log(err);
            callback(null, err);
        });
};

const updateUserProducts = (user_id, product_id, callback) => {
    const filter = { id: user_id };
    const updateQuery = { $pull: { products: product_id } };

    User.updateOne(filter, updateQuery).then(result => {
        callback(result);
    }).catch(err => {
        callback(err);
    })
};

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
                    const downloadLink = `https://drive.google.com/uc?id=${fileId}&export=download`;
                    callback({ file_id: fileId, file_name: (file_name) ? file_name : `${type}-${ids}`, link: downloadLink }, null);
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

const productSchema = new Schema({
    file_id: String,
    file_name: String,
    link: String
})

const productsSchema = new Schema({
    product_id: String,
    product_name: String,
    description: String,
    price: String,
    category: String,
    images: [productSchema],
    like: Number,
    view: Number,
    interaction: Number,
    release_date: String,
    seller: {
        seller_id: String
    }
});

const Product = mongoose.model('Product', productsSchema);

const addProduct = (product_name, description, price, category, images, seller_id, callback) => {
    const prices = price.includes(',') ? price.replace(/,/g, '.') : price;
    const product_id = helper.createID(10);
    const dates = helper.getDate();

    var fileData = new Product({ product_id, product_name, description, price: prices, category, images, like: 0, view: 0, interaction: 0, release_date: dates, seller: { seller_id } });
    const datas = {
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
    }
    fileData.save().then(() => callback(datas)).catch(err => callback(null, err));
    return;
}

const getProduct = (product_id, callback) => {
    Product.findOne({ product_id }).select('-_id -__v').then(result => {
        if (!result) return callback(false);
        callback(result);
    }).catch(err => {
        console.log(err);
        callback(null, err);
    });
}

const updateProduct = (product_id, action, value, field, callback) => {
    Product.findOne({ product_id })
        .then(result => {
            if (!result) return callback(false);
            if (!result[field]) return callback('not_found')
            const updateAction = {};
            const filter = {
                product_id: product_id
            };

            if (action === 'set') {
                updateAction.$set = { [field]: value };
            } else if (action === 'push') {
                updateAction.$push = { [field]: value };
            } else if (action === 'pull') {
                updateAction.$pull = { [field]: value };
            } else if (action === 'unset') {
                updateAction.$set = { [field]: null };
            }

            Product.updateOne(filter, updateAction)
                .then(() => callback(true))
                .catch(err => callback(err));
        })
        .catch(err => {
            console.log(err);
            callback(null, err);
        });
};

const updateProductArray = (product_id, action, remove = false, old_file_id, new_file_id, file_name, links, callback) => {
    Product.findOne({ product_id })
        .then(result => {
            if (!result) return callback(false);
            const filter = (action == 'update') ? { product_id, 'images.file_id': old_file_id } : { product_id }
            let updateQuery = {}

            if (remove) {
                updateQuery = { $pull: { images: { file_id: old_file_id } } };
            } else if (action == 'update') {
                updateQuery = { $set: { 'images.$.file_id': new_file_id, 'images.$.file_name': file_name, 'images.$.link': links } };
            } else {
                var newProduct = {
                    file_id: new_file_id,
                    file_name,
                    link: links
                }
                updateQuery = { $push: { images: newProduct } };
            }

            Product.updateOne(filter, updateQuery).then(() => callback(true)).catch(err => callback(err));
        }).catch(err => {
            callback(err);
        })
};

const removeProduct = (seller_id, product_id, callback) => {
    Product.findOne({ product_id })
        .then(result => {
            if (!result) return callback(false);

            Promise.all([
                Product.deleteMany({ product_id }),
                User.updateOne({ id: seller_id }, { $pull: { images: product_id } })
            ])
                .then(() => callback(true))
                .catch(err => callback(err));
        })
        .catch(err => {
            console.log(err);
            callback(null, err);
        });
};


const db = {
    addUser,
    getUserData,
    addProduct,
    getProduct,
    addToDrive,
    removeFromDrive,
    updateUserData,
    updateProduct,
    updateProductArray,
    updateUserProducts,
    removeProduct
}
module.exports = db;