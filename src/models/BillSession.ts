import mongoose from 'mongoose';

const ActiveUsers = new mongoose.Schema(
  {
    userID: String,
    joinedAt: Date,
  },
  { _id: false }
);

const BillSessionSchema = new mongoose.Schema({
  billID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    require: true,
  },
  activeUsers: [ActiveUsers],
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
