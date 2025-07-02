import mongoose from 'mongoose';

const ProductBill = new mongoose.Schema({
  productID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    require: true,
  },
  name: {
    type: mongoose.Schema.Types.String,
    ref: 'Product',
    required: true,
  },
  pricePerUnit: {
    type: mongoose.Schema.Types.Number,
    ref: 'Product',
    required: true,
  },
  hasPaid: {
    type: Boolean,
    default: false,
    required: false,
  },
  reservedBy: {
    type: String || null,
    default: null,
    required: false,
  },
  reservedAt: {
    type: Date || null,
    default: null,
    required: false,
  },
});

const BillSchema = new mongoose.Schema({
  restaurantID: {
    type: String,
    require: true,
  },
  tableNumber: {
    type: String,
    require: false,
  },
  products: [ProductBill],
  total: {
    type: Number,
    default: 0,
    require: true,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid'],
    default: 'pending',
  },
  qrCode: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Bill', BillSchema);
