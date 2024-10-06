import mongoose from 'mongoose';

const BillSessionSchema = new mongoose.Schema({
  billID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    require: true,
  },
  activeUsers: [
    {
      userID: String,
      joinedAt: Date,
    },
  ],
  paymentStatus: [
    {
      userID: String,
      amount: {
        type: Number,
        default: 0,
        require: true,
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'partially_paid'],
        default: 'pending',
      },
      items: [
        {
          itemID: String,
          quantity: Number,
        },
      ],
    },
  ],
  itemReservations: [
    {
      itemID: String,
      userID: String,
      quantity: {
        type: Number,
        default: 0,
      },
      reservedAt: {
        type: Date,
        required: true,
      },
    },
  ],
  totalAmountPaid: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('BillSession', BillSessionSchema);
