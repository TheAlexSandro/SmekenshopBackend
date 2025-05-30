import * as argon2 from "argon2";
import * as JWT from "jsonwebtoken";
import * as errors from "../../data/error.json";
import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import * as db from "../database/db";

const redClient = new Redis(process.env.REDIS_URI as string, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    tls: {
        rejectUnauthorized: true,
    }
});

type UserCallback<T> = (result: T | null, error?: Error) => void;

interface ProductData {
    status: string;
    product_id: string;
    product_name: string;
    description: string;
    price: string;
    category: string;
    images: string[];
    like: string;
    view: string;
    interaction: string;
    release_date: string;
    seller: {
        seller_id: string;
    },
    message: string | null;
    stock: string;
    is_disabled: boolean;
}

const response = (res: Response, status_code: number, ok: boolean, message: string | Error, error_code: string | null = null, result: any = null): void => {
    let msg = message;
    if (status_code === 400) {
        msg = message instanceof Error ? message.message : message;
    }
    res.status(status_code).json(
        cleanJSON({
            ok,
            status_code,
            error_code,
            message: msg,
            result,
        })
    );
    return;
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

const isValidProduct = (p: ProductData | null): p is ProductData =>
    p !== null
  

const sortedProduct = async (rest: ProductData[], limit: number): Promise<ProductData[] | Error> => {
    return new Promise(async (resolve, reject) => {
        try {
            const getCache = await redClient.get("summary");
            let cached: ProductData[] = getCache ? JSON.parse(getCache) : [];

            const validProducts = (
                await Promise.all(
                    cached.map((product) =>
                        new Promise<ProductData | null>((resolve) => {
                            db.getProduct(product.product_id, "approved", false, (rest: any, err: Error) => {
                                if (err || !rest || rest.is_disabled === true) return resolve(null);
                                db.getUserData(rest.seller.seller_id, (rests: any, err: Error) => {
                                    if (err || !rests || rests.role == 'banned') return resolve(null);
                                    resolve(productInject(product, rests.name));
                                });
                            });
                        })
                    )
                )
            ).filter(isValidProduct)
            const missingCount = limit - validProducts.length;

            if (missingCount > 0) {
                const newProducts = rest
                    .filter((product) => !validProducts.some((p) => p.product_id === product.product_id))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, missingCount);
                const news = await Promise.all(
                    newProducts.map(
                        (product) =>
                            new Promise<ProductData | null>((resolve) => {
                                db.getUserData(product.seller.seller_id, (rests: any, err: Error) => {
                                    if (err || !rests || rests.role == 'banned') return resolve(null);
                                    resolve(productInject(product, rests.name));
                                });
                            })
                    )
                );

                const updatedProducts = [...validProducts, ...news.filter(isValidProduct)]
                await redClient.setex("summary", Number(process.env.REDIS_TTL), JSON.stringify(updatedProducts));

                return resolve(updatedProducts);
            }

            resolve(validProducts);
        } catch (error) {
            console.error("Error in sortedProduct:", error);
            reject(error);
        }
    });
};

const searchProduct = (products: ProductData[], query: string | null = null, category: string | null = null): ProductData[] => {
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

const productInject = (product: any, sellerName: string) => {
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

const getDates = () => {
    const now = new Date();
    const formattedDate = now.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).replace(/\./g, ":").replace(/\,/g, "");

    return formattedDate;
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
    productInject,
    getDates
};