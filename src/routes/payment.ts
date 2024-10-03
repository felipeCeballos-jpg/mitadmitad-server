import express from 'express';
import { makePayment } from '../controllers/payment';

const paymentRouter = express.Router();

paymentRouter.post('/', makePayment);

export default paymentRouter;
