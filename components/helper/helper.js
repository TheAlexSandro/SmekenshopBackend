const argon = require('argon2');
const JWT = require('jsonwebtoken');
const errors = require('../../data/error.json');

const response = (res, status_code, ok, message, error_code = null, result = null) => {
    return res.status(status_code).json(cleanJSON({ ok, status_code, error_code, message, result }));
}

const detectParam = (...params) => {
    return params.every(param => param !== undefined && param !== null && param !== '');
}

const pwd = (method, password, hashed, callback) => {
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

const generateKey = (data, expires = '5m') => {
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

const helper = {
    response,
    detectParam,
    pwd,
    createID,
    generateKey,
    decodeKey,
    verifyServerID,
    cleanJSON
};
module.exports = helper;