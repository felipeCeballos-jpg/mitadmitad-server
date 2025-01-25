import mongoose from 'mongoose';

const Product = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: {
    type: Number,
    default: 0,
    require: true,
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
  products: [Product],
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
