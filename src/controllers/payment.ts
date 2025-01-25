import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { processPayment } from '../services/payment';
import mongoose from 'mongoose';
import BillSession from '../models/BillSession';
import { processSetAmountPayment } from '../services/payAmount';
import { splitBillPayment } from '../services/splitBill';

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
      splitInfo,
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
      splitInfo: {
        totalPeope: number;
        peoplePaying: number;
      };
    } = req.body;
    let result;

    switch (paymentType) {
      case 'setAmount':
        result = await processSetAmountPayment(billID, userID, {
          amount: amount,
          token: paymentToken,
          installments: installments,
          paymentMethodID: paymentMethodId,
          issuerID: issuer,
        });
        break;

      // TODO: why we don't pass the amount?
      case 'splitBill':
        result = await splitBillPayment(billID, userID, splitInfo, {
          token: paymentToken,
          installments: installments,
          paymentMethodID: paymentMethodId,
          issuerID: issuer,
        });
        break;
      default:
        res.status(400).json({ success: false, error: 'Invalid payment type' });
    }
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}
