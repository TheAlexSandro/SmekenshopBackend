const argon = require('argon2');
const JWT = require('jsonwebtoken');
const errors = require('../../data/error.json');

const response = (res, status_code, ok, message, error_code = null, result = null) => {
    if (status_code == 400) { try { var msg = message.message } catch { var msg = message } };
    const m = msg ? msg : message
    return res.status(status_code).json(cleanJSON({ ok, status_code, error_code, message: m, result }));
}

const detectParam = (...params) => {
    return params.every(param => param !== undefined && param !== null && param !== '');
}

const pwd = (method, password, hashed = null, callback) => {
    if (method == 'enc') {
        argon.hash(password, { type: argon.argon2id }).then(hash => {
            callback(hash);
        }).catch(e => {
            callback(null, e);
        });
    }

    if (method == 'dec') {
        argon.verify(hashed, password).then(result => {
            callback(result);
        }).catch(e => {
            callback(null, e);
        });
        return;
    }
}

const createID = (length) => {
    var result = [];
    var panjangKode = Number(length);
    var characters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var panjangkarakter = characters.length;

    for (var i = 0; i < panjangKode; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * panjangkarakter)));
    }

    var r = result.join("");
    return r;
}

const generateKey = (data, expires = '30d') => {
    var payload = typeof data === 'object' ? data : { id: data };
    var token = JWT.sign(payload, process.env.JWT_SECRET, { expiresIn: expires });
    return token;
}

const decodeKey = (token) => {
    try {
        var decode = JWT.verify(token, process.env.JWT_SECRET);
        return decode;
    } catch {
        return 'expired';
    }
}

const verifyServerID = (req, res, serverID, next) => {
    const serverIDs = req.body.server_id ? req.body.server_id : req.query.server_id;
    const state = req.query.state;
    const server_id = state ? JSON.parse(Buffer.from(state, 'base64').toString('utf8')).server_id : serverIDs;

    if ((!state && !detectParam(server_id)) || (server_id != serverID)) {
        return response(res, 403, false, errors[403]['403.access'].message, errors[403]['403.access'].code);
    }
    next();
}

const cleanJSON = (data) => {
    const cleared = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== undefined && value !== null));
    return cleared;
}

const getDate = () => {
    var date = new Date();
    var day = String(date.getDate()).padStart(2, "0");
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var year = String(date.getFullYear()).slice(2);

    var formattedDate = `${day}/${month}/${year}`;
    return formattedDate;
}

const sortedProduct = (rest) => {
    var filter = rest.filter(product => product.like > 0 || product.view > 0 || product.interaction > 0);

    if (filter.length === 0) {
        return { ok: false, msg: "Tidak ada produk yang memenuhi kriteria." };
    }

    var sortedProducts = filter.sort((a, b) => {
        return (b.like + b.view + b.interaction) - (a.like + a.view + a.interaction);
    });

    var updatedProducts = sortedProducts.map(product => ({
        ...product,
        images: product.images.map(image => ({
            ...image,
            link: `${process.env.GOOGLE_DRIVE_URL}${image.file_id}`
        }))
    }));

    return { ok: true, result: updatedProducts };
}

const searchProduct = (products, query) => {
    var result = [];
    query = query.toLowerCase();

    for (var i = 0; i < products.length; i++) {
        var name = String(products[i].product_name.toLowerCase());
        if (name.includes(query)) { result.push(products[i]) };
    }

    return result;
}

const helper = {
    response,
    detectParam,
    pwd,
    createID,
    generateKey,
    decodeKey,
    verifyServerID,
    cleanJSON,
    getDate,
    sortedProduct,
    searchProduct
};
module.exports = helper;