import "dotenv/config";
import app from "./components/api/init";
import multer from "multer";

import { updateAccount, updateRole, accountList } from "./controllers/account/route";
import { authSignup, authSignin, authSignout } from "./controllers/auth/route";
import { getProductList, productReview, productUpload, productUpdate,  productRemove, productSummary, productSearch } from "./controllers/product/route";
import { verifyToken, verifyProduct, verifyAccount } from "./controllers/verify/route";

const port: number = Number(process.env.PORT) || 3000;
const memo: multer.StorageEngine = multer.memoryStorage();
const uploads = multer({ storage: memo, limits: { fileSize: 20000000 } });

app.post("/account/update", uploads.single("file"), updateAccount);
app.post("/account/role", updateRole);
app.post("/account/list", accountList)
app.post("/auth/signup", uploads.single("file"), authSignup);
app.post("/auth/signin", authSignin);
app.post("/auth/signout", authSignout);
app.post("/product/list", getProductList);
app.post("/product/review", productReview);
app.post("/product/upload", uploads.any(), productUpload);
app.post("/product/update", uploads.any(), productUpdate);
app.post("/product/remove", productRemove);
app.post("/product/summary", productSummary);
app.post("/product/find", productSearch);
app.post("/verify/token", verifyToken);
app.post("/verify/product", verifyProduct);
app.post("/verify/account", verifyAccount);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
