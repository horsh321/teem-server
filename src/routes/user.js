import express from "express";
import * as UserController from "../controllers/user.js";
import { verifyToken, Roles } from "../middleware/verifyAuth.js";
import limitRequests from "../middleware/rateLimit.js";

const router = express.Router();

router.post("/register", UserController.signUp);
router.post("/login", limitRequests, UserController.login);
router.post("/email-login", UserController.loginViaEmail);
router.post(
  "/forgot-password",
  limitRequests,
  UserController.forgotUserPassword
);
router.post("/refresh-token", UserController.refereshAccessToken);
router.get("/getrefreshtoken/:id", UserController.getUserRefreshToken);
router.get("/authorize/:userId/:loginCode", UserController.verifyLoginLink);

router.get("/", verifyToken(Roles.All), UserController.authenticateUser);

router.delete(
  "/delete-account",
  verifyToken(Roles.All),
  UserController.deleteUserAccount
);

router.patch(
  "/reset-password/:userId/:token",
  limitRequests,
  UserController.resetUserPassword
);
router.patch(
  "/update-account",
  verifyToken(Roles.All),
  UserController.updateUserAccount
);

export default router;
