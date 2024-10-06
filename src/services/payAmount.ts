import mongoose from 'mongoose';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import { processPayment } from './payment';

export async function processSetAmountPayment(
  billID: string,
  userID: string,
  paymentData: {
    amount: number;
    token: string;
    installments: number;
    paymentMethodID: string;
    issuerID: number;
  }
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await Bill.findById(billID).session(session);
    const billSession = await BillSession.findOne({ billID }).session(session);

    if (!bill || !billSession) {
      throw new Error('Bill or Bill session not found');
    }

    const remainingAmount = bill.total - billSession.totalAmountPaid;

    if (paymentData.amount > remainingAmount) {
      throw new Error(`The maximun amount you can pay is ${remainingAmount}`);
    }

    const newPaymentData = {
      transaction_amount: paymentData.amount,
      token: paymentData.token,
      //description: body.description,
      installments: paymentData.installments,
      payment_method_id: paymentData.paymentMethodID,
      issuer_id: paymentData.issuerID,
      payer: {
        email: 'ceballos-65@hotmail.com',
      },
    };
    const paymentResult = await processPayment(newPaymentData);

    if (!paymentResult.error) {
      throw new Error(paymentResult.error);
    }

    billSession.totalAmountPaid += paymentData.amount;
    billSession.paymentStatus.push({
      userID,
      amount: paymentData.amount,
      status: 'paid',
      items: [], // No specific products for set amount payment,
    });

    if (billSession.totalAmountPaid >= bill.total) {
      bill.status = 'paid';
    } else {
      bill.status = 'partially_paid';
    }

    await bill.save({ session });
    await billSession.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      data: { remainingAmount: bill.total - billSession.totalAmountPaid },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
