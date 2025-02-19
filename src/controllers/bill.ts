import { Request, Response } from 'express';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import ProductReservation from '../models/ProductReservation';
import Payment from '../models/Payment';
import { generateQRCode } from '../services/qrcode';

interface Product {
  name: string;
  price: number;
  quantity: number;
}

export async function createBill(req: Request, res: Response) {
  try {
    const { restaurantID, tableNumber, products } = req.body;

    if (!restaurantID || tableNumber <= 0 || products.length === 0) {
      res.status(400).json({ error: 'Missing required fields.' });
      return;
    }

    // Get the total of the bill
    const total = products.reduce(
      (sum: number, product: Product) => sum + product.price * product.quantity,
      0
    );

    // Creta an instance of the bill with the user request
    const bill = await Bill.create({
      restaurantID,
      tableNumber,
      products,
      total,
    });

    console.log('Bill: ', bill);

    const qrCode = await generateQRCode(bill._id.toString());
    bill.qrCode = qrCode;
    await bill.save();

    res.status(200).json({ success: true, data: bill });
    // TODO: Fix the err type
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function getBillByID(req: Request, res: Response) {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      res.status(400).json({ success: false, error: 'Bill not found' });
    }

    res.status(200).json({ success: true, data: bill });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function getBillStatus(req: Request, res: Response) {
  try {
    const { id: billID } = req.params;

    const bill = await Bill.findById({ _id: billID }).exec();

    if (!bill) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    const billSession = await BillSession.findOne({ billID }).exec();
    if (!billSession) {
      res.status(404).json({ success: false, error: 'Bill session not found' });
      return;
    }

    const payment = await Payment.find({ billId: billID }).exec();
    if (!payment) {
      res.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }

    const productsReserved = await ProductReservation.find({
      billId: billID,
    }).exec();
    if (!productsReserved) {
      res
        .status(404)
        .json({ success: false, error: 'Product reservation not found' });
      return;
    }

    const totalPaid = payment.reduce(
      (sum, payment) => sum + payment.subTotal,
      0
    );

    console.log('Total amount paid: ', totalPaid);
    const remainingAmount = Math.max(
      0,
      bill.total - billSession.totalAmountPaid
    );
    console.log('Remaining amount: ', remainingAmount);

    const response = {
      billID: bill._id,
      total: bill.total,
      status: bill.status,
      totalAmountPaid: billSession.totalAmountPaid,
      remainingAmount,
      activeUsers: billSession.activeUsers,
      paymentStatus: payment,
      reservedProducts: productsReserved,
    };

    res.status(200).json({ success: true, data: response });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getProductsReserved(req: Request, res: Response) {
  try {
    const { id: billID } = req.params;

    if (!billID) {
      res.status(404).json({ success: false, error: 'Missing parameter' });
      return;
    }

    const bill = await Bill.findById({ _id: billID });
    const billSession = await BillSession.findOne({ billID });

    if (!bill || !billSession) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    const productsReserved = await ProductReservation.find({
      billSessionId: billSession._id,
    }).exec();

    res.status(200).json({
      success: true,
      data: productsReserved,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
