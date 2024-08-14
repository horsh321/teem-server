import express from "express";
import * as MerchantController from "../controllers/merchant.js";
import { verifyToken, Roles } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post(
  "/create",
  verifyToken(Roles.All),
  MerchantController.createMerchant
);

router.get("/", verifyToken(Roles.Seller), MerchantController.getMerchant);

router.patch(
  "/:id/update",
  verifyToken(Roles.Seller),
  MerchantController.updateMerchantAccount
);

router.delete(
  "/delete",
  verifyToken(Roles.Seller),
  MerchantController.deleteMerchantAccount
);

router.get(
  "/:merchantCode/get/sales",
  verifyToken(Roles.Seller),
  MerchantController.seeOrderRecords
);

export default router;
