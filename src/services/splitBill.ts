import mongoose from 'mongoose';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import { processPayment } from './payment';

interface SplitInfo {
  totalPeope: number;
  peoplePaying: number;
}

export async function splitBillPayment(
  billID: string,
  userID: string,
  splitInfo: SplitInfo,
  paymentMethod: string,
  paymentData: {
    token: string;
    installments: number;
    paymentMethodID: string;
    issuerID: string;
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
    const amountPerPerson = remainingAmount / splitInfo.totalPeope;
    const amountToPay = amountPerPerson * splitInfo.peoplePaying;
    const newPaymentData = {
      transaction_amount: amountToPay,
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

    billSession.totalAmountPaid += amountToPay;
    billSession.paymentStatus.push({
      userID,
      amount: amountToPay,
      status: 'paid',
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

    return {
      success: true,
      data: {
        amountPaid: amountToPay,
        remainingAmount: bill.total - billSession.totalAmountPaid,
        remainingPeople: splitInfo.totalPeope - splitInfo.peoplePaying,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
