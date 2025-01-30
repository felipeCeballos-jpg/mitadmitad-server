import { Request, Response } from 'express';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';

export async function createUser(req: Request, res: Response) {
  try {
    const newID = crypto.randomUUID();
    res.status(200).json({ success: true, data: { id: newID } });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: 'Not Possible to create an user' });
  }
}

export async function checkUserBill(req: Request, res: Response) {
  try {
    const { userID, billID } = req.params;

    const bill = await Bill.findById(billID);
    if (!bill) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    if (bill.status === 'paid') {
      res.status(400).json({ success: false, error: 'Bill already paid' });
      return;
    }

    // Check if the user is in the activeUsers array
    const billSession = await BillSession.findOne({ billID });
    if (!billSession) {
      res.status(404).json({ success: false, error: 'Bill not found' });
      return;
    }

    const userFound = billSession.activeUsers.find(
      (user) => user.userID === userID
    );

    if (!userFound) {
      console.log('User not found');
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const totalPaid = billSession.paymentStatus.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const products = bill.products.map((billProduct) => {
      const newProduct = [];

      if (
        !billSession.productReservations ||
        billSession.productReservations.length <= 0
      ) {
        return newProduct.push({
          _id: billProduct.id,
          name: billProduct.name,
          price: billProduct.price,
          quantity: billProduct.quantity,
          reserved: false,
          reservedBy: null,
        });
      }

      const foundProduct = billSession.productReservations.find(
        (billSessionProduct) => billSessionProduct.productID === billProduct.id
      );

      if (!foundProduct) {
      }
    });

    const remainingAmount = Math.max(0, bill.total - totalPaid);
    const data = {
      _id: bill._id,
      status: bill.status,
      products: bill.products,
      total: remainingAmount,
    };

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
