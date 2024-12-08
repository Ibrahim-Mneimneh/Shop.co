import express, { Router } from 'express';
import { addProduct, addProductImage, addProductVariant, adminLogin, updateVariantSale } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = express.Router();

// Add product
router.post("/login",adminLogin)
router.use("/",authMiddleware)
router.post("/products",addProduct)
router.post("/products/images",addProductImage)
router.patch("/products/variants/:variantId",updateVariantSale)
router.post("/products/:productId",addProductVariant)


export const adminRoutes=router