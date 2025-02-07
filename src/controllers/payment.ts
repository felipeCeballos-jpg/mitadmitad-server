import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { processPayment } from '../services/payment';
import mongoose from 'mongoose';
import BillSession from '../models/BillSession';
import { processSetAmountPayment } from '../services/payAmount';
import { splitBillPayment } from '../services/splitBill';

/* export async function makePayment(req: Request, res: Response) {
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
      tip?: number;
      paymentMethodId: string;
      transactionAmount: number;
      paymentToken: string;
      installments: number;
      issuer: number;
      items?: { itemID: string; quantity: number }[];
      paymentType: 'setAmount' | 'splitBill' | 'payForItems';
      splitInfo?: {
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
        if (!splitInfo) {
          res.status(400).json({ success: false, error: 'Missing split info' });
          return;
        }

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
} */

type PaymentRequest = {
  billID: string;
  userID: string;
  subtotal: number;
  tip: number;
  total: number;
  paymentType: 'setAmount' | 'splitBill' | 'payForItems';
  items?: { itemID: string; quantity: number }[];
  splitInfo?: {
    totalPeope: number;
    peoplePaying: number;
  };
};

export async function makePayment(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      billID,
      userID,
      subtotal,
      tip,
      total,
      paymentType,
      items,
      splitInfo,
    }: PaymentRequest = req.body;
    const bill = await Bill.findById(billID).session(session);
    const billSession = await BillSession.findOne({ billID }).session(session);

    console.log({
      billID,
      userID,
      subtotal,
      tip,
      total,
      paymentType,
      items,
      splitInfo,
    });

    if (!bill || !billSession) {
      console.log('Bill or Bill session not found');
      throw new Error('Bill or Bill session not found');
    }

    console.log('Total amount bill: ', bill.total);
    console.log('Total amount paid: ', billSession.totalAmountPaid);
    const remainingAmount = bill.total - billSession.totalAmountPaid;
    console.log('Remaining amount: ', remainingAmount);

    if (subtotal > remainingAmount) {
      console.log('The amount is bigger than remaining amount');
      throw new Error(`The maximun amount you can pay is ${remainingAmount}`);
    }

    billSession.totalAmountPaid += subtotal;
    console.log('Total amount paid: ', billSession.totalAmountPaid);

    billSession.paymentStatus.push({
      userID,
      subtotal,
      tip,
      total,
      status: 'paid',
      mode: paymentType,
      items: [],
    });

    if (billSession.totalAmountPaid >= bill.total) {
      bill.status = 'paid';
    } else {
      bill.status = 'partially_paid';
    }

    await bill.save({ session });
    await billSession.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        amountPaid: total,
        remainingAmount: bill.total - billSession.totalAmountPaid,
      },
    });
  } catch (error: any) {
    console.log('Error from makePayment: ', error);
    res.status(400).json({ success: false, error: error.message });
  }
}
