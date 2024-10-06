import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { processPayment } from '../services/payment';
import mongoose from 'mongoose';
import BillSession from '../models/BillSession';
import { processSetAmountPayment } from '../services/payAmount';

export async function makePayment(req: Request, res: Response) {
  try {
    const {
      billID,
      userID,
      amount,
      paymentMethod,
      tip,
      paymentMethodId,
      transactionAmount,
      paymentToken,
      installments,
      issuer,
      items,
      paymentType,
    }: {
      billID: string;
      userID: string;
      amount: number;
      paymentMethod: string;
      tip: number;
      paymentMethodId: string;
      transactionAmount: number;
      paymentToken: string;
      installments: number;
      issuer: number;
      items: { itemID: string; quantity: number }[];
      paymentType: 'setAmount' | 'splitBill' | 'payForItems';
    } = req.body;
    let result;

    switch (paymentType) {
      case 'setAmount':
        result = await processSetAmountPayment(billID, userID, amount, {
          paymentToken,
        });
    }
    res.status(200).json({ success: true, data: paymentResult });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}
