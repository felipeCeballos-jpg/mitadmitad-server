import { Server } from 'socket.io';
import BillSession from '../models/BillSession';
import {
  releaseReservations,
  reserveProducts,
  releaseProducts,
} from './productReservation';
import Bill from '../models/Bill';

export function socketInit(io: Server) {
  io.on('connection', (socket) => {
    console.log('Connection: ', socket.id);
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
      const billSession = await BillSession.findByIdAndUpdate(
        { billID },
        { $pop: { userID } }
      );

      if (billSession) {
        io.to(billID).emit('user-left', {
          userID,
          activeUsers: billSession.activeUsers,
        });
      }

      socket.leave(billID);
    });

    socket.on(
      'update-payment-status',
      async (
        billID: string,
        userID: string,
        status: 'pending' | 'paid' | 'failed'
      ) => {
        const billSession = await BillSession.findOne({ billID });

        if (billSession) {
          const userPayment = billSession.paymentStatus.find(
            (payment) => payment.userID === userID
          );

          if (userPayment) {
            userPayment.status = status;
            await billSession.save();

            io.to(billID).emit('payment-status-updated', { userID, status });
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
          productPosition,
        }: {
          billID: string;
          userID: string;
          product: { _id: string; quantity: number };
          productPosition: number;
        },
        callback
      ) => {
        console.log('Entreeee No lo puedo creerr');
        try {
          console.log('Products from Client: ', product);
          const reservations = await reserveProducts(billID, userID, product);
          console.log('Reservations: ', reservations);
          callback({ status: true });
          socket.broadcast.to(billID).emit('product-reserved', {
            userID,
            productID: product._id,
            productPosition,
          });
        } catch (error: any) {
          socket.emit('reservation-error', { error: error.message });
        }
      }
    );

    socket.on(
      'release-product',
      async (
        {
          billID,
          userID,
          productID,
          productPosition,
        }: {
          billID: string;
          userID: string;
          productID: string;
          productPosition: number;
        },
        callback
      ) => {
        try {
          const reservations = await releaseProducts(billID, userID, productID);
          console.log('Realeased resevations: ', reservations);
          callback({ status: true });
          socket.broadcast
            .to(billID)
            .emit('product-released', { userID, productID, productPosition });
        } catch (error: any) {
          socket.emit('reservation-error', { error: error.message });
        }
      }
    );

    socket.on('payment-made', async (billID) => {
      console.log('Payment Madeeeeeeeeeeeeeeeeeeee');
      console.log('BillID: ', billID);
      const bill = await Bill.findById(billID);
      const billSession = await BillSession.findOne({ billID }).populate(
        'billID'
      );

      if (billSession && billSession.billID && bill) {
        console.log('Entreeeeeeee ajajajajjaja');
        socket.to(billID).emit('bill-updated', {
          totalAmountPaid: billSession.totalAmountPaid,
          remainingAmount: bill.total - billSession.totalAmountPaid,
          status: bill.status,
        });
      }
    });

    socket.on(
      'release-reservations',
      async ({ billID, userID }: { billID: string; userID: string }) => {
        await releaseReservations(billID, userID);
        io.to(billID).emit('reservations-released', { userID });
      }
    );

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
  });
}
