import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: String,
  pricePerUnit: Number,
});

export default mongoose.model('Product', ProductSchema);
