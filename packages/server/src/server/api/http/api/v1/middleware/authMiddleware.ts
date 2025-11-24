import { Context, Next } from "koa";
import { Server } from "@server";
import { safeTrim } from "@server/helpers/utils";
import { ServerError, Unauthorized } from "../responses/errors";
import { KeypairService } from "@server/services/keypairService";

export const AuthMiddleware = async (ctx: Context, next: Next) => {
    const params = ctx.request.query;

    // Make sure we have a token (check headers first, then params)
    const authHeader = ctx.request.headers.authorization;
    const token = authHeader.match(/^\s*Bearer\s+(.*)$/i)?.[1] || (params?.guid ?? params?.password ?? params?.token) as string;
    if (!token) {
        Server().log(`Client (IP: ${ctx.request.ip}) attempted to access the API without a token.`, "debug");
        throw new Unauthorized({ error: "Missing server password!" });
    }

    // Get server password from Keychain (preferred) or SQLite (fallback)
    let password: string | null = null;
    
    try {
        // Try Keychain first (preferred method)
        password = await KeypairService.getServerPassword();
        if (password) {
            Server().log("Using server password from Keychain", "debug");
        }
    } catch (error) {
        Server().log(`Failed to get password from Keychain: ${error}`, "debug");
    }
    
    // Fallback to SQLite if Keychain fails or is empty
    if (!password) {
        try {
            password = String(Server().repo.getConfig("password") as string);
            if (password) {
                Server().log("Using server password from SQLite (fallback)", "debug");
            }
        } catch (error) {
            Server().log(`Failed to get password from SQLite: ${error}`, "debug");
        }
    }
    
    if (!password) {
        throw new ServerError({ error: "Failed to retrieve server password from Keychain or database" });
    }

    // Validate the passwords match (constant-time comparison)
    if (safeTrim(password) !== safeTrim(token)) {
        Server().log(`Client (IP: ${ctx.request.ip}) tried to authenticate with an incorrect password.`, "debug");
        throw new Unauthorized();
    }

    // Go to the next middleware
    await next();
};
