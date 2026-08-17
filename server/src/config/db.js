import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-hotel';
  console.log('📡 Connecting to MongoDB...');
  while (true) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.error('❌ MongoDB connection failed, retrying in 5s...', err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export default mongoose;
