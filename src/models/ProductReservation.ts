import mongoose, { SchemaType } from 'mongoose';
import Product from './Product';

interface ProductReservationType {
  billSessionId: object;
  productId: object;
  quantity: number;
  hasPaid: boolean;
  reservedBy: string;
  reservedAt: Date;
}

const ProductReservationSchema = new mongoose.Schema<ProductReservationType>({
  billSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillSession',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
    required: true,
  },
  hasPaid: {
    type: Boolean,
    default: false,
    required: false,
  },
  reservedBy: {
    type: String,
    required: true,
  },
  reservedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

ProductReservationSchema.pre('save', function (this, next) {
  next();
});

export default mongoose.model('ProductReservation', ProductReservationSchema);
