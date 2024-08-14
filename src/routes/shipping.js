import express from "express";
import * as ShippingController from "../controllers/shipping.js";
import { verifyToken, Roles } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post(
  "/:merchantCode/create",
  verifyToken(Roles.Seller),
  ShippingController.createShippingFee
);
router.get("/:merchantCode/all", ShippingController.getAllShippingFee);
router.get(
  "/:merchantCode/get/:shippingId",
  ShippingController.getASingleShippingFee
);
router.get(
  "/:merchantCode/get/:state/amount",
  ShippingController.getShippingAmount
);
router.patch(
  "/:merchantCode/update/:shippingId",
  verifyToken(Roles.Seller),
  ShippingController.updateShippingFee
);

router.delete(
  "/:merchantCode/delete/:shippingId",
  verifyToken(Roles.Seller),
  ShippingController.deleteShippingFee
);

export default router;
