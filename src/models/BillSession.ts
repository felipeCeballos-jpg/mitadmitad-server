import mongoose from 'mongoose';

const ProductReservations = new mongoose.Schema({
  productID: String,
  userID: String,
  quantity: {
    type: Number,
    default: 0,
  },
  reservedAt: {
    type: Date,
    required: true,
  },
});

const Product = new mongoose.Schema(
  {
    productID: String,
    quantity: Number,
  },
  { _id: false }
);

const PaymentStatus = new mongoose.Schema({
  userID: String,
  amount: {
    type: Number,
    default: 0,
    validate: {
      validator: function (value: number) {
        return value >= 0; // Ensure amount is non-negative
      },
      message: 'Amount must be a non-negative value.',
    },
    require: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  products: [Product],
});

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
  paymentStatus: [PaymentStatus],
  productReservations: {
    type: [ProductReservations],
    required: false,
  },
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
