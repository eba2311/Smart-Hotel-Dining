import mongoose from 'mongoose';

export async function connectDb(retries = 5, delayMs = 5000) {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-hotel';
  if (process.env.NODE_ENV === 'production' && uri.startsWith('mongodb://localhost')) {
    console.error('⚠️  MONGO_URI is not set! Set the MONGO_URI env var (e.g. MongoDB Atlas) in the deployment platform settings.');
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection failed (attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        process.exit(1);
      }
    }
  }
}

export default mongoose;
