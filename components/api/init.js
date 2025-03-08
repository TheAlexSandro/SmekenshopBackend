require('dotenv').config({ path: '.env' });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const helper = require('../helper/helper');
const helmet = require('helmet');

const serverID = process.env.SERVER_ID;
const publicFolder = path.join(__dirname, "../../public");

const app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicFolder));

app.use((req, res, next) => {
    if (req.method === 'GET') return res.sendFile(path.join(publicFolder, 'index.html'))
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