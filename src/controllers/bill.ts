import { Request, Response } from 'express';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import ProductReservation from '../models/ProductReservation';
import Payment from '../models/Payment';
import { generateQRCode } from '../services/qrcode';
import { validateCreateBill, validateGetBillByID } from '../utils/validations';
import Product from '../models/Product';
import { getProducts, ProductDB } from '../utils/util';
import { Schema } from 'mongoose';

export async function createBill(req: Request, res: Response) {
  try {
    const { restaurantID, tableNumber, products } = req.body;
    const validate = validateCreateBill(req.body);

    if (!validate.success) {
      console.log(validate.error.message);
      res.status(400).json({ error: JSON.stringify(validate.error.message) });
      return;
    }

    let _products = await getProducts(products);

    if (!_products)
      throw Error('Something is wrong with the products - Create Bill');

    // Get the total of the bill
    const total = _products.reduce((sum: number, product) => {
      return sum + product.pricePerUnit;
    }, 0);

    // Creta an instance of the bill with the user request
    const bill = await Bill.create({
      restaurantID,
      tableNumber,
      products: _products,
      total,
    });

    const qrCode = await generateQRCode(bill._id.toString());
    bill.qrCode = qrCode;
    await bill.save();

    res.status(200).json({
      success: true,
      data: {
        _id: bill._id,
        restaurantID: bill.restaurantID,
        tableNumber: bill.tableNumber,
        total,
        status: bill.status,
        products: _products,
        qrCode: bill.qrCode,
        createdAt: bill.createdAt,
      },
    });

    // TODO: Fix the err type
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function getBillByID(req: Request, res: Response) {
  try {
    const validate = validateGetBillByID(req.params.id);

    if (!validate.success) {
      res.status(400).json({
        error: 'The bill id provided is invalid, please insert a valid bill id',
      });
      return;
    }

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
    const validate = validateGetBillByID(billID);

    if (!validate.success) {
      res.status(400).json({
        error: 'The bill id provided is invalid, please insert a valid bill id',
      });
      return;
    }

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

    const remainingAmount = Math.max(
      0,
      bill.total - billSession.totalAmountPaid
    );

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

    const validate = validateGetBillByID(billID);
    if (!validate.success) {
      res.status(400).json({
        error: 'The bill id provided is invalid, please insert a valid bill id',
      });
      return;
    }

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
