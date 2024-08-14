import express from "express";
import * as TaxController from "../controllers/tax.js";
import { verifyToken, Roles } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post(
  "/:merchantCode/create",
  verifyToken(Roles.Seller),
  TaxController.createTax
);

router.get("/:merchantCode/all", TaxController.getAllTax);
router.get("/:merchantCode/get/:taxId", TaxController.getASingleTax);

router.patch(
  "/:merchantCode/update/:taxId",
  verifyToken(Roles.Seller),
  TaxController.updateTax
);

router.delete(
  "/:merchantCode/delete/:taxId",
  verifyToken(Roles.Seller),
  TaxController.deleteTax
);
export default router;
