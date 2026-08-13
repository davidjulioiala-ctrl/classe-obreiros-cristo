import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getLocalUserFromRequest } from "./localAuthMiddleware";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Todas as operações protegidas usam a sessão local HMAC criada pelo
    // endpoint /api/auth/login. Não tentar OAuth como fallback: um token
    // externo em app_session_id não é uma sessão local válida e não deve
    // transformar uma operação normal num erro JWS/"Please login".
    user = await getLocalUserFromRequest(opts.req, opts.res);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
