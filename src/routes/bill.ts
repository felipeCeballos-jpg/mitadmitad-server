import express from 'express';
import { createBill, getBillByID } from '../controllers/bill';

const billRouter = express.Router();

billRouter.post('/', createBill);
billRouter.get('/:id', getBillByID);

export default billRouter;
