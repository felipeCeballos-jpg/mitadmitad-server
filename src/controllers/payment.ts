import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { processPayment } from '../services/payment';

export async function makePayment(req: Request, res: Response) {
  try {
    const {
      billID,
      amount,
      paymentMethod,
      tip,
      paymentMethodId,
      transactionAmount,
      paymentToken,
      installments,
      issuer,
    } = req.body;
    const bill = await Bill.findById(billID);

    if (!bill) {
      res.status(400).json({ success: false, error: 'Bill no found' });
      return;
    }

    const paymentData = {
      transaction_amount: Number(transactionAmount),
      token: paymentToken,
      //description: body.description,
      installments: Number(installments),
      payment_method_id: paymentMethodId,
      issuer_id: issuer,
      payer: {
        email: 'ceballos-65@hotmail.com',
      },
    };

    //const totalAmount = amount + (tip || 0);
    const paymentResult = await processPayment(paymentData);
    if (!paymentResult.success) {
      res.status(400).json({ success: false, error: paymentResult.error });
      return;
    }

    bill.status = amount >= bill.total ? 'paid' : 'partially_paid';
    await bill.save();
    res.status(200).json({ success: true, data: paymentResult });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}
