import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not set! Add it as an environment variable on Render.');
    process.exit(1);
  }
  if (uri.includes('localhost')) {
    console.error('❌ MONGO_URI points to localhost! Replace it with your Atlas connection string on Render.');
    process.exit(1);
  }
  console.log('📡 Connecting to MongoDB Atlas...');
  while (true) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log('✅ MongoDB Atlas connected');
      return;
    } catch (err) {
      if (err.message.includes('whitelist') || err.message.includes('IP')) {
        console.error('❌ Atlas is blocking this server IP. Go to MongoDB Atlas → Network Access → Add IP Address → type 0.0.0.0/0 → Confirm.');
      } else {
        console.error('❌ MongoDB connection failed, retrying in 5s...', err.message);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export default mongoose;
