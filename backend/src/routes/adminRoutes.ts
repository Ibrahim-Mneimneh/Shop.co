import express, { Router } from 'express';
import { addProduct, addProductImage, addProductVariant, adminLogin, deleteProduct, deleteProductVariant, deleteVariantSale, getProduct, restockProduct, updateDeliveryStatus, updateVariantSale } from '../controllers/adminController';
import { adminAuthMiddleware, authMiddleware } from '../middleware/authMiddleware';
import { sessionMiddleware } from '../middleware/sessionMiddleware';

const router: Router = express.Router();

// Add product
router.post("/login",adminLogin)

// Auth Middleware for routes
router.use("/",adminAuthMiddleware)

// Add Product 
router.post("/products",addProduct)
// Add Product Images
router.post("/products/images",addProductImage)
// Get Product & its variants
router.get("/products/:productId",getProduct) // *********** Modify for later 
// Add varinat Sale or update it
router.patch("/products/variants/sales/:variantId",sessionMiddleware,updateVariantSale)
// Delete variant Sale
router.delete("/products/variants/sales/:variantId",sessionMiddleware,deleteVariantSale)
// Soft Delete Product
router.delete("/products/:productId",sessionMiddleware,deleteProduct)
// Soft Delete Variant
router.delete("/products/variants/:variantId",deleteProductVariant) 
// Restock Product
router.patch("/products/restock/:productId",sessionMiddleware,restockProduct) 
// Add Variant for a Product
router.post("/products/:productId/variants",sessionMiddleware,addProductVariant) 
// Update Order Status
router.patch("/orders/:orderId/status", updateDeliveryStatus);

export const adminRoutes=router