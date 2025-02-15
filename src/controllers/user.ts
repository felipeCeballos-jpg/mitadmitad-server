import { Request, Response } from 'express';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import Payment from '../models/Payment';

export async function createUser(req: Request, res: Response) {
  try {
    const { billID } = req.body;
    const bill = await Bill.findById(billID);

    if (!bill) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    if (bill.status === 'paid') {
      res.status(400).json({ success: false, error: 'Bill already paid' });
      return;
    }

    const newID = crypto.randomUUID();
    res.status(200).json({
      success: true,
      data: { id: newID, billStatus: bill.status, billID: bill._id },
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: 'Not Possible to create an user' });
  }
}

export async function checkUserBill(req: Request, res: Response) {
  try {
    const { userID, billID } = req.params;
    if (!userID || !billID) {
      res
        .status(404)
        .json({ success: false, error: 'Some parameters are missing' });
      return;
    }

    const bill = await Bill.findById(billID).exec();
    if (!bill) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    if (bill.status === 'paid') {
      res.status(400).json({ success: false, error: 'Bill already paid' });
      return;
    }

    const billSession = await BillSession.findOne({ billID }).exec();
    if (!billSession) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    const payments = await Payment.find({
      billSessionId: billSession._id,
    }).exec();

    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.subTotal,
      0
    );

    const remainingAmount = Math.max(0, bill.total - totalPaid);

    const data = {
      _id: bill._id,
      status: bill.status,
      products: bill.products,
      total: remainingAmount,
      totalBill: bill.total,
    };

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
