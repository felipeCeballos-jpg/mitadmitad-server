import { Request, Response } from 'express';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import Payment from '../models/Payment';
import { processPayment } from '../services/payment';
import { processSetAmountPayment } from '../services/payAmount';
import { splitBillPayment } from '../services/splitBill';
import ProductReservation from '../models/ProductReservation';
import { logger } from '../utils/logger';
import { MongoError } from 'mongodb';
import { validateCreatePayment } from '../utils/validations';

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
  products?: { productID: string; quantity: number; position: number }[];
  splitInfo?: {
    totalPeople: number;
    peoplePaying: number;
  };
};

export async function makePayment(req: Request, res: Response) {
  const session = await Payment.startSession();
  session.startTransaction();

  try {
    const {
      billID,
      userID,
      subtotal,
      tip,
      total,
      paymentType,
      products,
      splitInfo,
    }: PaymentRequest = req.body;

    const validateBody = validateCreatePayment(req.body);
    if (!validateBody.success) {
      console.log(validateBody.error.message);
      res.status(400).json({
        error: 'Some went wrong or something is missing',
      });
      return;
    }

    const bill = await Bill.findById(billID).session(session);
    const billSession = await BillSession.findOne({ billID }).session(session);

    if (!bill || !billSession) {
      throw new Error('Bill or Bill session not found');
    }

    const remainingAmount = bill.total - billSession.totalAmountPaid;

    if (subtotal > remainingAmount) {
      throw new Error(`The maximun amount you can pay is ${remainingAmount}`);
    }

    billSession.totalAmountPaid += subtotal;

    const payment = await Payment.create({
      billSessionId: billSession._id,
      userId: userID,
      subTotal: subtotal,
      tip,
      total,
      status: 'paid',
      mode: paymentType,
    });

    if (paymentType === 'payForItems') {
      await Bill.find({
        _id: billID,
        'products.reservedBy': userID,
      })
        .updateMany({
          $set: {
            'products.$.hasPaid': true,
          },
        })
        .session(session);
    } else {
      await Bill.find({
        _id: billID,
        'products.reservedBy': userID,
      })
        .updateMany({
          $set: {
            'products.$.reservedBy': null,
            'products.$.reservedAt': null,
          },
        })
        .session(session);
    }

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
        billStatus: bill.status,
        amountPaid: total,
        remainingAmount: bill.total - billSession.totalAmountPaid,
        products: bill.products,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();

    if (
      error instanceof MongoError &&
      error.hasErrorLabel('UnknownTransactionCommitResult')
    ) {
      // add your logic to retry or handle the error
      console.log(
        'An error occured in the unknown transaction commit result:',
        error
      );
      res.status(400).json({
        success: false,
        error: 'Something went wrong, please try again',
      });
    } else if (
      error instanceof MongoError &&
      error.hasErrorLabel('TransientTransactionError')
    ) {
      // add your logic to retry or handle the error
      console.log('An error occured in the transient transaction:', error);

      res.status(400).json({
        success: false,
        error: 'Something went wrong, please try again',
      });
    } else {
      console.log(
        'An error occured in the transaction, performing a data rollback:' +
          error
      );
      res.status(400).json({ success: false, error: error.message });
    }
    console.log('Error from makePayment: ', error);
    logger.error(error);
  } finally {
    session.endSession();
  }
}
