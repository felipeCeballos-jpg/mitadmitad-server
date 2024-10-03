import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { generateQRCode } from '../services/qrcode';

interface Item {
  name: string;
  price: number;
  quantity: number;
}

export async function createBill(req: Request, res: Response) {
  try {
    const { restaurantID, tableNumber, items } = req.body;

    // Get the total of the bill
    const total = items.reduce(
      (sum: number, item: Item) => sum + item.price * item.quantity,
      0
    );

    // Creta an instance of the bill with the user request
    const bill = new Bill({
      restaurantID,
      tableNumber,
      items,
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
