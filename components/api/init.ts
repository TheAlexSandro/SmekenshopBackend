import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import * as helper from "../helper/helper";
import * as errors from "../../data/error.json";

const serverID: string | undefined = process.env.SERVER_ID;
const publicFolder: string = path.join(__dirname, "../../public");

const app = express();

app.use(helmet());
app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
})

app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));
app.use(bodyParser.json({ limit: '20kb' }));
app.use(express.static(publicFolder));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (res.statusCode === 403) {
    helper.response(res, 403, false, errors[403]["403.cors"].message, errors[403]["403.cors"].code);
    return;
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (['PUT', 'DELETE', 'OPTIONS'].includes(req.method)) { helper.response(res, 403, false, errors[403]["403.method"].message, errors[403]["403.method"].code); return; }
  if (req.method === "GET") { res.sendFile(path.join(publicFolder, "index.html")); return; }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/product/upload") && !req.path.startsWith("/account/update") && !req.path.startsWith("/product/update")) {
    helper.verifyServerID(req, res, serverID, next);
  } else {
    next();
  }
});

export default app;