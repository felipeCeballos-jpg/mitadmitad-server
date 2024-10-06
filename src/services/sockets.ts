import { Server } from 'socket.io';
import BillSession from '../models/BillSession';
import { releaseReservations, reserveProducts } from './productReservation';

export function setupSocketIO(io: Server) {
  io.on('connection', (socket) => {
    socket.on('join-bill', async (billID: string, userID: string) => {
      socket.join(billID);

      let billSession = await BillSession.findOne({ billID });
      if (!billSession) {
        billSession = new BillSession({ billID, activeUsers: [] });
      }

      billSession.activeUsers.push({ userID, joinedAt: new Date() });
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
        status: 'pending' | 'paid' | 'partially_paid'
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
        billID: string,
        userID: string,
        products: { itemID: string; quantity: number }[]
      ) => {
        try {
          const reservations = await reserveProducts(billID, userID, products);
          io.to(billID).emit('products-reserved', { userID, reservations });
        } catch (error: any) {
          socket.emit('reservation-error', { error: error.message });
        }
      }
    );

    socket.on(
      'release-reservations',
      async (billID: string, userID: string) => {
        await releaseReservations(billID, userID);
        io.to(billID).emit('reservations-released', { userID });
      }
    );

    socket.on('disconnect', async () => {
      // Release all reservations for the disconnected user
      const billSession = await BillSession.find({
        'activeUsers.userID': socket.id,
      });

      for (const session of billSession) {
        await releaseReservations(session.billID, socket.id);
        io.to(session.billID).emit('reservations-released', {
          userID: socket.id,
        });
      }
    });
  });
}
