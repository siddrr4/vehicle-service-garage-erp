import mongoose from 'mongoose';
import dns from 'dns';

// Workaround for Node.js DNS resolution issues with MongoDB Atlas SRV records on some environments
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore in environments where setting DNS servers is not permitted
}

let cachedPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    const opts = {
      bufferCommands: false,
    };
    cachedPromise = mongoose.connect(process.env.MONGO_URI, opts)
      .then((mongooseInstance) => {
        console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
        return mongooseInstance.connection;
      })
      .catch((error) => {
        cachedPromise = null;
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (process.env.VERCEL !== '1') {
          process.exit(1);
        }
        throw error;
      });
  }

  return cachedPromise;
};

export default connectDB;
