import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  billSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillSession',
    required: true,
  },
  userId: String,
  subTotal: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function (value: number) {
        return value >= 0; // Ensure amount is non-negative
      },
      message: 'Amount must be a non-negative value.',
    },
    require: true,
  },
  tip: {
    type: Number,
    default: 0,
    require: false,
  },
  total: {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator: function (value: number) {
        return value >= 0; // Ensure amount is non-negative
      },
      message: 'Amount must be a non-negative value.',
    },
  },
  mode: {
    type: String,
    enum: ['setAmount', 'splitBill', 'payForItems'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
    required: true,
  },
  paidAt: { type: Date, default: Date.now },
});

export default mongoose.model('Payment', PaymentSchema);
