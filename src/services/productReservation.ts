import { Types, Document } from 'mongoose';
import Bill from '../models/Bill';
import BillSession from '../models/BillSession';

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
  const session = await BillSession.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);
    const reserveTime = new Date();

    if (!billSession || !bill) {
      throw new Error('Bill or session not found');
    }

    if (!billSession.productReservations)
      throw new Error('Reservations not found');

    // Check if product exists on the bill
    const billProduct = bill.products.find((item) => {
      return item._id.toString() === product._id;
    });

    if (!billProduct) {
      throw new Error(`Product ${product._id} not found in the bill`);
    }

    const reservedQuantity = billSession.productReservations
      .filter(
        (reservation) => reservation.productID?.toString() === product._id
      )
      .reduce((sum, reservation) => sum + reservation.quantity, 0);

    const availableQuantity = billProduct.quantity - reservedQuantity;

    if (availableQuantity < product.quantity) {
      throw new Error(
        `Not enough quantity available for item {id: ${product._id}, name: ${billProduct.name}}`
      );
    }

    /* if (billSession.productReservations.length <= 0) {
      console.log("How many times I'm here");
      billSession.productReservations.push({
        productID: product._id,
        userID,
        quantity: product.quantity,
        reservedAt: reserveTime,
      });

      await billSession.save({ session });
      await session.commitTransaction();

      return billSession.productReservations;
    } */
    const hasUserAlreadyReservedProduct = billSession.productReservations.some(
      (pdtr) => {
        return pdtr.productID === product._id && pdtr.userID === userID;
      }
    );

    console.log('Has product storage: ', hasUserAlreadyReservedProduct);

    if (!hasUserAlreadyReservedProduct) {
      console.log("How many times I'm here");
      billSession.productReservations.push({
        productID: product._id,
        userID,
        quantity: product.quantity,
        reservedAt: reserveTime,
      });

      await billSession.save({ session });
      await session.commitTransaction();

      return billSession.productReservations;
    }

    // Update the quantity of the product reservation for user
    billSession.productReservations = billSession.productReservations.map(
      (pdtr) => {
        if (pdtr.productID === product._id && pdtr.userID === userID) {
          pdtr.quantity += product.quantity;
        }
        return pdtr;
      }
    ) as ProductReservation;

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

    await billSession.save({ session });
    await session.commitTransaction();

    console.log('Products Reservations: ', billSession.productReservations);
    return billSession.productReservations;
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
  const session = await BillSession.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);

    if (!billSession || !bill) {
      throw new Error('Bill or session not found');
    }

    if (!billSession.productReservations)
      throw new Error('Reservations not found');

    const hasUserAlreadyReservedProduct = billSession.productReservations.some(
      (pdtr) => {
        return pdtr.productID === productID && pdtr.userID === userID;
      }
    );

    if (!hasUserAlreadyReservedProduct) {
      throw new Error(`User ${userID} has not reserved product ${productID}`);
    }

    // Update the quantity of the product reservation for user and remove zero quantity reservations
    billSession.productReservations = billSession.productReservations.filter(
      (p) => {
        if (p.userID === userID && p.productID === productID) {
          --p.quantity;
        }

        if (p.quantity !== 0) return p;
      }
    ) as ProductReservation;

    // TODO: Delete the product that has been reserved
    await billSession.save({ session });
    await session.commitTransaction();

    console.log('Released reservation: ', billSession.productReservations);
    return billSession.productReservations;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function releaseReservations(billID: string, userID: string) {
  const billSession = await BillSession.findOne({ billID });
  if (billSession && billSession.productReservations) {
    billSession.productReservations = billSession.productReservations.filter(
      (r) => r.userID !== userID
    ) as ProductReservation;
    await billSession.save();
  }
}
