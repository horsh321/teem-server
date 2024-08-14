import express from "express";
import * as OrderController from "../controllers/order.js";
import { verifyToken, Roles } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post(
  "/:merchantCode/create",
  verifyToken(Roles.All),
  OrderController.createOrder
);
router.get("/:merchantCode/all", OrderController.getAllOrders);
router.get("/:merchantCode/all/:userId", OrderController.getAllClientOrders);
router.get("/:merchantCode/get/:orderId", OrderController.getAnOrder);
router.patch(
  "/:merchantCode/update/:orderId",
  verifyToken(Roles.All),
  OrderController.updateAnOrderStatus
);
router.post(
  "/:merchantCode/checkout",
  verifyToken(Roles.All),
  OrderController.createCheckout
);
router.delete(
  "/:merchantCode/cancel/:orderId",
  verifyToken(Roles.All),
  OrderController.cancelOrder
);

export default router;
