import * as argon2 from "argon2";
import * as JWT from "jsonwebtoken";
import * as errors from "../../data/error.json";
import { Request, Response, NextFunction } from "express";
import * as db from "../database/db";

type UserCallback<T> = (result: T | null, error?: Error) => void;

interface Product {
    [key: string]: any;
}

interface SortedProductResponse {
    ok: boolean;
    msg?: string;
    result?: Product[];
}

const response = (res: Response, status_code: number, ok: boolean, message: string | Error, error_code: string | null = null, result: any = null): Response => {
    let msg = message;
    if (status_code === 400) {
        msg = message instanceof Error ? message.message : message;
    }
    return res.status(status_code).json(
        cleanJSON({
            ok,
            status_code,
            error_code,
            message: msg,
            result,
        })
    );
};

const detectParam = (...params: any[]): boolean => {
    return params.every((param) => param !== undefined && param !== null && param !== "");
};

const pwd = (method: "enc" | "dec", password: string, hashed: string | null = null, callback: UserCallback<string | boolean>): void => {
    if (method === "enc") {
        argon2
            .hash(password, { type: argon2.argon2id })
            .then((hash) => callback(hash))
            .catch((e) => callback(null, e));
    }

    if (method === "dec" && hashed) {
        argon2
            .verify(hashed, password)
            .then((result) => callback(result))
            .catch((e) => callback(null, e));
    }
};

const createID = (length: number): string => {
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const panjangKarakter = characters.length;
    let result = "";

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * panjangKarakter));
    }

    return result;
};

const generateKey = (data: object | string | number, expires: string = "30d"): string => {
    const payload = typeof data === "object" ? data : { id: data };
    const options: JWT.SignOptions = { expiresIn: expires as unknown as JWT.SignOptions["expiresIn"] };

    return JWT.sign(payload, process.env.JWT_SECRET as string, options);
};

const decodeKey = (token: string): object | string => {
    try {
        return JWT.verify(token, process.env.JWT_SECRET as string) as object;
    } catch {
        return "expired";
    }
};

const verifyServerID = (req: Request, res: Response, serverID: string, next: NextFunction): Response | void => {
    const serverIDs = req.body.server_id || req.query.server_id;

    if (!serverIDs || serverIDs !== serverID) {
        return response(res, 403, false, errors[403]["403.access"].message, errors[403]["403.access"].code);
    }

    next();
};

const cleanJSON = <T extends Record<string, any>>(data: T): Partial<T> => {
    return Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
    ) as Partial<T>;
};

const getDate = (): string => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(2);

    return `${day}/${month}/${year}`;
};

const sortedProduct = async (rest: Product[]): Promise<SortedProductResponse> => {
    const filter = rest.filter(product => product.like > 0 || product.view > 0 || product.interaction > 0);

    if (filter.length === 0) {
        return { ok: false, msg: "Tidak ada produk yang memenuhi kriteria." };
    }

    const sortedProducts = filter.sort((a, b) =>
        (b.like + b.view + b.interaction) - (a.like + a.view + a.interaction)
    );

    const updatedProducts = await Promise.all(sortedProducts.map(async (product) => {
        const sellerName = await new Promise<string>((resolve) => {
            db.getUserData(product.seller.seller_id, (result: any, err: Error) => {
                if (err || !result) return resolve('N/A');
                resolve(result.name);``
            });
        });

        return productInject(product, sellerName);
    }))

    return { ok: true, result: updatedProducts };
};


const searchProduct = (products: Product[], query: string | null = null, category: string | null = null): Product[] => {
    if (query) { query = query.toLowerCase(); }
    if (category) { category = category.toLowerCase(); }

    if (category) {
        return products.filter(product =>
            product.category.toLowerCase().includes(category)
        );
    } else {
        return products.filter(product =>
            product.product_name.toLowerCase().includes(query)
        );
    }
};

const convertToJSON = (input: string) => {
    return input
        .replace(/([{,])\s*([^":\s]+)\s*:/g, '$1"$2":')
        .replace(/:\s*([^"{\[\]},\s]+)/g, ':"$1"')
        .replace(/([{,{])\s*([^":{}\[\],]+)\s*(?=[,}])/g, '$1"$2":""')
        .replace(/"\s*([a-zA-Z0-9_]+)\s*"\s*:\s*"([^"]*)"/g, '"$1":"$2"');
};

const productInject = (product: Product, sellerName: string) => {
    return {
        ...product,
        images: product.images.map((image: { file_id: string }) => ({
            ...image,
            link: `${process.env.GOOGLE_DRIVE_URL}${image.file_id}`,
        })),
        seller: {
            ...product.seller,
            name: sellerName,
        }
    }
}

export {
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
    searchProduct,
    convertToJSON,
    productInject
};