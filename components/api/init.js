require('dotenv').config({ path: '.env' });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const helper = require('../helper/helper');
const errors = require('../../data/error.json');
const helmet = require('helmet');

const originList = process.env.ALLOWED_ORIGIN.split(',');
const serverID = process.env.SERVER_ID;
const publicFolder = path.join(__dirname, "../../public");

const app = express();

app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || originList.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(403));
        }
    }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicFolder));

app.use((err, req, res, next) => {
    if (err && err.message == 403) return helper.response(res, 403, false, errors[403]['403.cors'].message, errors[403]['403.cors'].code);
    next(err);
});

app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/auth/google/callback')) return res.sendFile(path.join(publicFolder, 'index.html'))
    next();
});

app.use((req, res, next) => {
    if (!req.path.startsWith('/product/upload') && !req.path.startsWith('/account/update/profile')) {
        helper.verifyServerID(req, res, serverID, next);
    } else {
        next();
    }
});

module.exports = app;