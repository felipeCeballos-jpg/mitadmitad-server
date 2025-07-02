import mongoose, { Schema } from 'mongoose';

interface ProductReservationType {
  billSessionId: object;
  productBillId: object;
  quantity: number;
  position: number[];
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
  productBillId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
    required: true,
  },
  position: {
    type: [Schema.Types.Number],
    min: 0,
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
