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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(publicFolder));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (res.statusCode === 403) {
    return helper.response(res, 403, false, errors[403]["403.cors"].message, errors[403]["403.cors"].code);
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (['PUT', 'DELETE', 'OPTIONS'].includes(req.method)) return helper.response(res, 403, false, errors[403]["403.method"].message, errors[403]["403.method"].code);
  if (req.method === "GET") return res.sendFile(path.join(publicFolder, "index.html"));
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