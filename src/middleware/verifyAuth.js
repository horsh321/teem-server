import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import env from "../utils/validateEnv.js";

export const verifyToken =
  (roles = []) =>
  async (req, res, next) => {
    if (!Array.isArray(roles)) roles = [roles];
    const { authorization: token } = req.headers;
    if (!token) {
      return next(createHttpError(403, "You are unauthenticated, pls login"));
    }
    if (!token.startsWith("Bearer")) {
      return next(createHttpError(401, "Token format is invalid"));
    }
    const tokenString = token.split(" ")[1]
    try {
      //decode token by passing the token and your jwt secret key
      const decodedToken = jwt.verify(tokenString, env.JWT_ACCESS_TOKEN);
      if (!decodedToken.role) {
        return next(
          createHttpError(403, "Error: user does not have a role assigned")
        );
      }
      if (!roles.includes(decodedToken.role)) {
        return next(
          createHttpError(403, "User not authorized for this request")
        );
      }
      //validating user via the decodedToken
      req.user = decodedToken;
      next();
    } catch (error) {
      return next(createHttpError(401, "Session expired, pls login "));
    }
  };

export const Roles = {
  User: ["user"],
  Seller: ["user", "seller"],
  Admin: ["user", "seller", "admin"],
  All: ["user", "seller", "admin"],
};
