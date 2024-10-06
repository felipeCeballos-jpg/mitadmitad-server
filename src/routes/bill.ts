import express from 'express';
import { createBill, getBillByID, getBillStatus } from '../controllers/bill';

const billRouter = express.Router();

billRouter.post('/', createBill);
billRouter.get('/:id', getBillByID);
billRouter.get('/:bill/status', getBillStatus);

export default billRouter;
