import mongoose from 'mongoose';

export const ProductSchema = new mongoose.Schema({
  name: String,
  pricePerUnit: {
    type: Number,
    default: 0,
    required: true,
  },
});

export default mongoose.model('Product', ProductSchema);
