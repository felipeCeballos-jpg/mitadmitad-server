import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { generateQRCode } from '../services/qrcode';
import BillSession from '../models/BillSession';

interface Product {
  name: string;
  price: number;
  quantity: number;
}

export async function createBill(req: Request, res: Response) {
  try {
    const { restaurantID, tableNumber, products } = req.body;

    // Get the total of the bill
    const total = products.reduce(
      (sum: number, product: Product) => sum + product.price * product.quantity,
      0
    );

    // Creta an instance of the bill with the user request
    const bill = new Bill({
      restaurantID,
      tableNumber,
      products,
      total,
    });

    // Create the bill on the database
    const saveBill = await bill.save();

    const qrCode = await generateQRCode(saveBill._id.toString());
    saveBill.qrCode = qrCode;
    await saveBill.save();

    res.status(200).json({ success: true, data: saveBill });
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

    const bill = await Bill.findById({ _id: billID });
    if (!bill) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    const billSession = await BillSession.findOne({ billID });
    if (!billSession) {
      res.status(404).json({ success: false, error: 'Bill session not found' });
      return;
    }

    const totalPaid = billSession.paymentStatus.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const remainingAmount = Math.max(0, bill.total - totalPaid);

    const response = {
      billID: bill._id,
      total: bill.total,
      status: bill.status,
      totalPaid,
      remainingAmount,
      activeUsers: billSession.activeUsers,
      paymentStatus: billSession.paymentStatus,
      reservedProducts: billSession.productReservations,
    };

    res.status(200).json({ success: true, data: response });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
