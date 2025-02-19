import mongoose from 'mongoose';

export async function retry(callback: any, maxRetries = 3) {
  const session = await mongoose.startSession();
  let retries = 0;
  while (retries) {}
}
