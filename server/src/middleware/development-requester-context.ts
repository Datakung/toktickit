import type { RequestHandler } from "express";
import { requireRequester, type AuthLocals, type SafeUser } from "../auth/auth-middleware.js";

// Compatibility names keep Lab 2 route internals stable while identity now comes
// only from the authenticated session. The legacy header is deliberately ignored.
export type DevelopmentRequester = SafeUser;
export interface DevelopmentRequesterLocals extends AuthLocals { developmentRequester: SafeUser }
export const developmentRequesterContext: RequestHandler<Record<string,string>,unknown,unknown,Record<string,string>,DevelopmentRequesterLocals> = (request, response, next) => {
  requireRequester(request, response, error => {
    if (error) return next(error);
    if (response.headersSent) return;
    response.locals.developmentRequester = response.locals.currentUser;
    next();
  });
};
