import { Server } from 'socket.io';
import BillSession from '../models/BillSession';
import {
  releaseReservations,
  reserveProducts,
  releaseProducts,
} from './productReservation';
import Bill from '../models/Bill';
import Payment from '../models/Payment';
import ProductReservation from '../models/ProductReservation';
import { logger } from '../utils/logger';

export function socketInit(io: Server) {
  io.on('connection', (socket) => {
    if (socket.recovered) {
      // recovery was successful: socket.id, socket.rooms and socket.data were restored
      logger.info('Recovered socket: ', socket.id);
    } /* else {
      logger.error("Can't recover socket: ", socket.id);
    } */

    socket.on('join-bill', async (billID: string, userID: string) => {
      socket.join(billID);

      let billSession = await BillSession.findOne({ billID });

      if (!billSession) {
        billSession = new BillSession({ billID, activeUsers: [] });
      }

      // check if user is already connected
      const hasUsersActived = billSession.activeUsers.filter(
        (user) => user.userID === userID
      );

      const userFoundedit = 1;
      if (hasUsersActived.length < userFoundedit) {
        billSession.activeUsers.push({ userID, joinedAt: new Date() });
      }

      await billSession.save();

      io.to(billID).emit('user-joined', {
        userID,
        activeUsers: billSession.activeUsers,
      });
    });

    socket.on('leave-bill', async (billID: string, userID: string) => {
      try {
        const products = await Bill.find({
          _id: billID,
          'products.reservedBy': userID,
        }).updateMany({
          $set: {
            'products.$.reservedBy': null,
            'products.$.reservedAt': null,
          },
        });

        console.log({ billID, userID, products });

        const billSession = await BillSession.findOne({
          billID: billID,
        }).updateOne({ $pull: { activeUsers: { userID: userID } } });

        console.log({ billSession });
        if (billSession && products) {
          io.to(billID).emit('user-left', {
            userID,
            //activeUsers: billSession.activeUsers,
          });
        }
      } catch (err) {
        console.log({ err });
        console.warn('We have a problem on leave bill, please check');
      } finally {
        socket.leave(billID);
      }
    });

    socket.on(
      'update-payment-status',
      async (
        billID: string,
        userID: string,
        status: 'pending' | 'paid' | 'failed'
      ) => {
        const billSession = await BillSession.findOne({ billID }).exec();
        const payments = await Payment.find({ billId: billID }).exec();

        if (billSession && payments) {
          const userPayment = payments.find(
            (payment) => payment.userId === userID
          );

          if (userPayment) {
            userPayment.status = status;
            await billSession.save();

            socket
              .to(billID)
              .emit('payment-status-updated', { userID, status });
          }
        }
      }
    );

    socket.on(
      'reserve-product',
      async (
        {
          billID,
          userID,
          product,
        }: {
          billID: string;
          userID: string;
          product: { productID: string; _id: string; quantity: number };
        },
        callback
      ) => {
        console.log('Entreeee No lo puedo creerr');
        try {
          const reservations = await reserveProducts(billID, userID, product);
          console.log('Reservationsssssss: ', reservations);

          callback({ status: true });
          socket.broadcast.to(billID).emit('product-reserved', {
            userID,
            _id: product._id,
            productID: product.productID,
          });
        } catch (error: any) {
          console.log('Something went wrong when reserving the product');
          logger.error(error);
          callback({ status: false, message: error.message });
          console.log(error);
          /* socket.to(billID).emit('reservation-error', { error: error.message }); */
        }
      }
    );

    socket.on(
      'release-product',
      async (
        {
          billID,
          userID,
          product,
        }: {
          billID: string;
          userID: string;
          product: {
            productID: string;
            _id: string;
          };
        },
        callback
      ) => {
        try {
          await releaseProducts(billID, userID, product);
          callback({ status: true });
          socket.broadcast.to(billID).emit('product-released', {
            userID,
            _id: product._id,
            productID: product.productID,
          });
        } catch (error: any) {
          logger.error(error);
          socket.to(billID).emit('reservation-error', { error: error.message });
        }
      }
    );

    socket.on('payment-made', async (billID, userID) => {
      console.log('Payment Madeeeeeeeeeeeeeeeeeeee');
      console.log('BillID: ', billID);
      const bill = await Bill.findById(billID);
      const billSession = await BillSession.findOne({ billID }).populate(
        'billID'
      );

      if (billSession && billSession.billID && bill) {
        try {
          const productsReserved = bill.products.filter((p) => {
            return p.reservedBy === userID;
          });

          console.log('Entreeeeeeee ajajajajjaja');
          socket.to(billID).emit('bill-updated', {
            totalAmountPaid: billSession.totalAmountPaid,
            remainingAmount: bill.total - billSession.totalAmountPaid,
            status: bill.status,
            productsReserved,
          });
        } catch (error) {
          logger.error(error);
          console.log('Error while updating the bill');
        }
      }
    });

    socket.on('disconnect', async () => {
      console.log('User Disconnect: ', socket.id);
      // Release all reservations for the disconnected user
      const billSession = await BillSession.find({
        'activeUsers.userID': socket.id,
      });
      console.log('Disconnect session: ', billSession);
      for (const session of billSession) {
        // TODO: this code need to be update and review
        if (session.billID) {
          await releaseReservations(session.billID.toString(), socket.id);
          io.to(session.billID.toString()).emit('reservations-released', {
            userID: socket.id,
          });
        }
      }
    });

    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  });
}
