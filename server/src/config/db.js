import mongoose from 'mongoose';
import { config } from './env.js';

// Enhanced MongoDB connection configuration with optimization
const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50, // Maximum number of connections in the connection pool
  minPoolSize: 5,  // Minimum number of connections in the connection pool
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  idleTimeoutMS: 60000,  // Close idle sessions after 60 seconds
  retryWrites: true,
  retryReads: true,
  // Enable compression for network traffic
  compressors: ['zlib'],
};

// Cache for frequently accessed data
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function connectDb() {
  console.log('📡 Connecting to MongoDB with optimized settings...');
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(config.mongoUri, connectionOptions);
      console.log('✅ MongoDB connected with optimized settings');

      // Set up query monitoring in development
      if (config.nodeEnv === 'development') {
        mongoose.set('debug', (collectionName, method, query, doc) => {
          console.log(`🔍 MongoDB Query: ${collectionName}.${method}`, JSON.stringify(query));
        });
      }

      // Set up connection event listeners
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      return;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB connection failed (attempt ${retries}/${maxRetries}), retrying in 5s...`, err.message);
      if (retries >= maxRetries) {
        console.error('❌ Max retries reached. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export async function disconnectDb() {
  try {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');

    // Clear query cache on disconnect
    queryCache.clear();
  } catch (err) {
    console.error('❌ Error disconnecting from MongoDB:', err);
  }
}

/**
 * Cached query wrapper for frequently accessed data
 */
export function cachedQuery(key, queryFn, ttl = CACHE_TTL) {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return Promise.resolve(cached.data);
  }

  return queryFn().then(data => {
    queryCache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

/**
 * Clear cache for specific pattern
 */
export function clearCachePattern(pattern) {
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys()),
  };
}

/**
 * Optimized lean query with projection
 */
export function leanQuery(Model, filter = {}, projection = {}) {
  return Model.find(filter).select(projection).lean().exec();
}

/**
 * Paginated query helper
 */
export async function paginatedQuery(Model, filter = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    projection = {},
  } = options;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Model.find(filter)
      .select(projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
