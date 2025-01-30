import express from 'express';
import {
  createBill,
  getBillByID,
  getBillStatus,
  getProductsReserved,
} from '../controllers/bill';

const billRouter = express.Router();

billRouter.post('/', createBill);
billRouter.get('/:id', getBillByID);
billRouter.get('/status/:id', getBillStatus);
billRouter.get('/productsReserved/:id', getProductsReserved);

export default billRouter;
