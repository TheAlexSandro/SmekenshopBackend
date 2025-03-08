require('dotenv').config({ path: '.env' });
const app = require('../components/api/init');
const multer = require('multer');

const { updateAccount, updateProfile } = require('./account/route');
const { authSignup, authSignin, authSignout } = require('./auth/route');
const { productUpload, productUpdate, productRemove, productSummary, productSearch } = require('./product/route');
const { verifyToken, verifyProduct, verifyAccount } = require('./verify/route');

const port = process.env.PORT || 3000;
const memo = multer.memoryStorage();
const uploads = multer({ storage: memo })

app.post('/account/update', updateAccount);
app.post('/account/update/profile', uploads.single('file'), updateProfile);
app.post('/auth/signup', authSignup);
app.post('/auth/signin', authSignin);
app.post('/auth/signout', authSignout);
app.post('/product/upload', uploads.any(), productUpload);
app.post('/product/update', productUpdate);
app.post('/product/remove', productRemove);
app.post('/product/summary', productSummary);
app.post('/product/find', productSearch);
app.post('/verify/token', verifyToken);
app.post('/verify/product', verifyProduct);
app.post('/verify/account', verifyAccount);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});