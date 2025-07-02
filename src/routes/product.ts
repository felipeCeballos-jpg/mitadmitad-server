import express from 'express';
import { createProduct, getProduct } from '../controllers/product';

const productRouter = express.Router();

productRouter.post('/', createProduct);
productRouter.get('/:id', getProduct);

export default productRouter;
