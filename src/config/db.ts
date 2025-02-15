import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const uri = `mongodb+srv://mm_app:${process.env.MONGODB_PASS}@mmdbapi.fy4rk.mongodb.net/?retryWrites=true&w=majority&appName=mmdbapi`;
// mongodb+srv://mm_app:${process.env.MONGODB_PASS}@mmdbapi.fy4rk.mongodb.net/?retryWrites=true&w=majority&appName=mmdbapi
export async function connectDB() {
  try {
    const conn = await mongoose.connect(uri, {});
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
