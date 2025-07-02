import { Types, Document, Schema } from 'mongoose';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import ProductReservation from '../models/ProductReservation';
import Payment from '../models/Payment';
import Product from '../models/Product';

const RESERVATION_TIMEOUT = 10 * 600 * 1000; // 10 minutes in miliseconds
type ProductReservation = Types.DocumentArray<
  {
    quantity: number;
    reservedAt: Date;
    userID?: string | null;
    ProductID?: string | null;
  } & Document
>;

export async function reserveProducts(
  billID: string,
  userID: string,
  product: { productID: string; _id: string; quantity: number }
) {
  const session = await Bill.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);
    const reserveTime = new Date();

    if (!billSession || !bill) {
      throw new Error('Bill is not found');
    }

    const payments = await Payment.find({
      billSessionId: billSession._id,
    }).session(session);

    // Check if product exists on the bill
    const billProduct = bill.products.find((item) => {
      return item._id.toString() === product._id;
    });

    if (!billProduct) {
      throw new Error(`Product ${product._id} not found in the bill`);
    }

    const totalBillPaid = payments.reduce(
      (sum, payment) => sum + payment.subTotal,
      0
    );

    /* const totalOfProductsReserved = productsReserved.reduce(
    (sum, product) => sum + product.quantity * product.pe,
      0
    ); */

    const totalBillPaidFuture = billProduct.pricePerUnit + totalBillPaid;
    const remainingAmount = Math.max(0, bill.total - totalBillPaidFuture);

    if (bill.total <= totalBillPaidFuture) {
      throw new Error(
        `The ${billProduct.name} product cost more than the current bill total`
      );
    }

    const hasUserAlreadyReservedProduct = bill.products.find((p) => {
      return p.reservedBy === userID && p._id.toString() === product._id;
    });

    if (!hasUserAlreadyReservedProduct) {
      const _product = await Bill.findOneAndUpdate(
        {
          _id: billID,
          'products._id': product._id,
        },
        {
          $set: {
            'products.$.reservedBy': userID,
            'products.$.reservedAt': reserveTime,
          },
        }
      );

      if (!_product) {
        throw Error("We couldn't save the rsservation, please try again");
      }

      await session.commitTransaction();
      //return _product;
    }

    await session.commitTransaction();

    //return quantityUpdated;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    console.log('Finalizando session');
    session.endSession();
  }
}

export async function releaseProducts(
  billID: string,
  userID: string,
  product: {
    _id: string;
    productID: string;
  }
) {
  const session = await Bill.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);

    if (!billSession || !bill) {
      throw new Error('Bill or session not found');
    }

    const _product = await Bill.findOneAndUpdate(
      {
        _id: billID,
        'products._id': product._id,
      },
      {
        $set: {
          'products.$.reservedBy': null,
          'products.$.reservedAt': null,
        },
      }
    );

    if (!_product) {
      throw Error("We couldn't save the rsservation, please try again");
    }
    // TODO: Delete the product that has been reserved
    await session.commitTransaction();
    return _product;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function releaseReservations(billID: string, userID: string) {
  /* const billSession = await BillSession.findOne({ billID });
  if (billSession && billSession.productReservations) {
    billSession.productReservations = billSession.productReservations.filter(
      (r) => r.reservedBy !== userID
    ) as ProductReservation;
    await billSession.save();
  } */
}
