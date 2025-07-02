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
billRouter.get('/:id/status', getBillStatus);
billRouter.get('/:id/productsReserved', getProductsReserved);

export default billRouter;
