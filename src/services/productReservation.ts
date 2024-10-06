import Bill from '../models/Bill';
import BillSession from '../models/BillSession';

const RESERVATION_TIMEOUT = 10 * 600 * 1000; // 10 minutes in miliseconds

export async function reserveProducts(
  billID: string,
  userID: string,
  products: { itemID: string; quantity: number }[]
) {
  const session = await BillSession.startSession();
  session.startTransaction();

  try {
    const billSession = await BillSession.findOne({ billID }).session(session);
    const bill = await Bill.findById(billID).session(session);

    if (!billSession || !bill) {
      throw new Error('Bill or session not found');
    }

    const now = new Date();

    // Remove expired reservations
    billSession.itemReservations = billSession.itemReservations.filter(
      (reservation) =>
        now.getTime() - reservation.reservedAt.getTime() < RESERVATION_TIMEOUT
    );

    // Check item availability and create new reservations
    for (const product of products) {
      const billProduct = bill.items.find(
        (item) => item._id.toString() === product.itemID
      );
      if (!billProduct) {
        throw new Error(`Product ${product.itemID} not found in the bill`);
      }

      const reservedQuantity = billSession.itemReservations
        .filter((r) => r.itemID === product.itemID)
        .reduce((sum, r) => sum + r.quantity, 0);

      const availableQuantity = billProduct.quantity - reservedQuantity;

      if (availableQuantity < product.quantity) {
        throw new Error(
          `Not enough quantity available for item ${product.itemID}`
        );
      }

      billSession.itemReservations.push({
        itemID: product.itemID,
        userID,
        quantity: product.quantity,
        reservedAt: now,
      });
    }

    await billSession.save({ session });
    await session.commitTransaction();

    return billSession.itemReservations;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function releaseReservations(billID: string, userID: string) {
  const billSession = await BillSession.findOne({ billID });
  if (billSession) {
    billSession.itemReservations = billSession.itemReservations.filter(
      (r) => r.userID !== userID
    );
    await billSession.save();
  }
}
