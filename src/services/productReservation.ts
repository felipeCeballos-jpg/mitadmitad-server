import { Types, Document } from 'mongoose';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';
import ProductReservation from '../models/ProductReservation';
import Payment from '../models/Payment';

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
  product: { _id: string; quantity: number }
) {
  const session = await ProductReservation.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);
    const reserveTime = new Date();

    if (!billSession || !bill) {
      throw new Error('Bill or session not found');
    }

    const productsReserved = await ProductReservation.find({
      billSessionId: billSession._id,
      reservedBy: userID,
    }).session(session);
    const payments = await Payment.find({
      billSessionId: billSession._id,
    }).session(session);

    // Check if product exists on the bill
    const billProduct = bill.products.find((item) => {
      return item._id.toString() === product._id;
    });

    console.log('Bill product: ', billProduct);

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
    console.log('Products reserved: ', productsReserved);
    const totalOfProductsReserved = productsReserved.map((prt) => {
      let product = bill.products.find((item) => {
        return item._id.toString() === prt.productId.toString();
      });

      if (!product) {
        return 0;
      }

      return prt.quantity * product.price;
    });

    console.log('Total of products reserved: ', totalOfProductsReserved);

    const totalProductsReserved = totalOfProductsReserved.reduce(
      (sum, num) => sum + num,
      0
    );
    console.log('TPR: ', totalProductsReserved);

    console.log('Total Bill Paid: ', totalBillPaid);
    const totalBillPaidFuture =
      billProduct.price + totalBillPaid + totalProductsReserved;
    console.log('Total Bill Paid Future: ', totalBillPaidFuture);
    const remainingAmount = Math.max(0, bill.total - totalBillPaidFuture);
    console.log('Remaining amount: ', remainingAmount);
    if (bill.total <= totalBillPaidFuture) {
      throw new Error(
        `You aren't allowed to reserve more products because you'll more than you should`
      );
    }

    if (productsReserved.length <= 0) {
      console.log("How many times I'm here");
      const newReservation = new ProductReservation({
        billSessionId: billSession._id,
        productId: product._id,
        reservedBy: userID,
        quantity: product.quantity,
        reservedAt: reserveTime,
      });

      await newReservation.save({ session });
      await session.commitTransaction();

      return newReservation;
    }

    const hasUserAlreadyReservedProduct = productsReserved.find((pdtr) => {
      return pdtr.productId.toString() === product._id;
    });

    console.log('Has product storage: ', hasUserAlreadyReservedProduct);

    if (!hasUserAlreadyReservedProduct) {
      console.log("How many times I'm here hasUserAlreadyReservedProduct");
      const newReservation = new ProductReservation({
        billSessionId: billSession._id,
        productId: product._id,
        reservedBy: userID,
        quantity: product.quantity,
        reservedAt: reserveTime,
      });

      await newReservation.save({ session });
      await session.commitTransaction();

      return newReservation;
    }

    const reservedQuantity = [hasUserAlreadyReservedProduct].reduce(
      (sum, reservation) => sum + reservation.quantity,
      0
    );

    const availableQuantity = billProduct.quantity - reservedQuantity;

    if (availableQuantity < product.quantity) {
      throw new Error(
        `Not enough quantity available for the product ${billProduct.name}`
      );
    }

    // Update the quantity of the product reservation for user
    const quantityUpdated = await ProductReservation.findOneAndUpdate(
      {
        billSessionId: billSession._id,
        productId: product._id,
        reservedBy: userID,
      },
      {
        quantity: hasUserAlreadyReservedProduct.quantity + product.quantity,
      },
      {
        new: true,
        session,
      }
    );

    console.log('Quantity updated: ', quantityUpdated);

    /* // Remove expired reservations
    billSession.productReservations = billSession.productReservations.filter(
      (reservation) => {
        console.log('ReservedAt Time: ', reservation.reservedAt.getTime());
        console.log('Reserve Time: ', reserveTime.getTime());
        const timeDifference =
          reserveTime.getTime() - reservation.reservedAt.getTime();
        console.log('Time difference: ', timeDifference);
        console.log(
          "Check if it's expired: ",
          timeDifference > RESERVATION_TIMEOUT
        );
        return timeDifference < RESERVATION_TIMEOUT;
      }
    ) as ProductReservation;

    console.log('Removed reservations: ', billSession.productReservations); */

    /* // Remove when aren't products reserved
    billSession.productReservations = billSession.productReservations.filter(
      (reservation) => reservation.quantity > 0
    ) as ProductReservation; */

    await session.commitTransaction();

    return quantityUpdated;
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
  productID: string
) {
  const session = await ProductReservation.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);

    if (!billSession || !bill) {
      throw new Error('Bill or session not found');
    }

    const productsReserved = await ProductReservation.find({
      billSessionId: billSession._id,
      productId: productID,
      reservedBy: userID,
    }).session(session);

    if (productsReserved.length <= 0) {
      throw new Error(`User ${userID} has not reserved product ${productID}`);
    }

    const newQuantity = productsReserved[0].quantity - 1;
    if (newQuantity === 0) {
      const isProductDeteled = await ProductReservation.deleteOne({
        billSessionId: billSession._id,
        productId: productID,
        reservedBy: userID,
      });

      if (isProductDeteled.deletedCount === 0) {
        throw new Error(`Something went wrong when deleting the product`);
      }

      await session.commitTransaction();
      return isProductDeteled;
    }

    const quantityUpdated = await ProductReservation.findOneAndUpdate(
      {
        billSessionId: billSession._id,
        productId: productID,
        reservedBy: userID,
      },
      {
        quantity: productsReserved[0].quantity - 1,
      },
      {
        new: true,
        session,
      }
    );

    // TODO: Delete the product that has been reserved
    await session.commitTransaction();
    return quantityUpdated;
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
