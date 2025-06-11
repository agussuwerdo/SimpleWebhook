import { createClient } from 'redis';

let redis: any = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export async function getRedisClient() {
  if (!redis) {
    redis = createClient({ 
      url: process.env.NEXT_PUBLIC_REDIS_URL || process.env.REDIS_URL || '',
      socket: {
        connectTimeout: 10000, // 10 seconds connection timeout
        keepAlive: 30000,      // 30 seconds keepalive
        noDelay: true,         // Disable Nagle's algorithm for better performance
        reconnectStrategy: (retries: number) => {
          // Exponential backoff with jitter
          const jitter = Math.floor(Math.random() * 1000);
          const delay = Math.min(Math.pow(2, retries) * 1000, 30000);
          console.log(`Redis reconnect attempt ${retries + 1}, waiting ${delay + jitter}ms`);
          return delay + jitter;
        }
      },
      // Disable offline queue to fail fast when disconnected
      disableOfflineQueue: true,
      // Ping interval to keep connection alive
      pingInterval: 30000, // 30 seconds
      // Command timeout at client level
      commandsQueueMaxLength: 100
    });
    
    redis.on('error', (err: any) => {
      console.warn('Redis Client Error (will use fallback):', err.message);
      // Don't reset redis to null here, let reconnection handle it
    });
    
    redis.on('connect', () => {
      console.log('Redis Client Connected');
      connectionAttempts = 0; // Reset counter on successful connection
    });

    redis.on('reconnecting', () => {
      console.log('Redis Client Reconnecting...');
    });

    redis.on('ready', () => {
      console.log('Redis Client Ready');
    });

    redis.on('end', () => {
      console.log('Redis Client Connection Ended');
    });
    
    try {
      await redis.connect();
      
      // Set socket keepalive after connection
      if (redis.socket && redis.socket.setKeepAlive) {
        redis.socket.setKeepAlive(true, 30000);
      }
      
    } catch (error) {
      connectionAttempts++;
      console.warn(`Redis connection failed (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}):`, error);
      
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.warn('Max Redis connection attempts reached, will use fallback storage');
        redis = null;
      }
      throw error;
    }
  }
  return redis;
}

// Command timeout wrapper function
async function executeWithTimeout<T>(
  operation: () => Promise<T>, 
  timeoutMs: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Redis command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export interface WebhookData {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  timestamp: string;
}

export async function storeWebhookData(data: WebhookData) {
  try {
    const client = await getRedisClient();
    const key = `webhook:${data.id}`;
    
    // Use pipeline for better performance with timeout
    await executeWithTimeout(async () => {
      const pipeline = client.multi();
      pipeline.setEx(key, 86400 * 7, JSON.stringify(data)); // Store for 7 days
      pipeline.zAdd('webhooks:timeline', {
        score: Date.now(),
        value: data.id
      });
      
      return await pipeline.exec();
    });
  } catch (error) {
    console.error('Error storing webhook data:', error);
    throw error;
  }
}

export async function getWebhookData(id: string): Promise<WebhookData | null> {
  try {
    const client = await getRedisClient();
    const key = `webhook:${id}`;
    
    const data = await executeWithTimeout(async () => {
      return await client.get(key);
    });
    
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting webhook data:', error);
    return null;
  }
}

export async function getAllWebhooks(limit: number = 50): Promise<WebhookData[]> {
  try {
    const client = await getRedisClient();
    
    // Get the most recent webhook IDs with timeout
    const webhookIds = await executeWithTimeout(async () => {
      return await client.zRange('webhooks:timeline', 0, limit - 1, { REV: true });
    });
    
    if (webhookIds.length === 0) {
      return [];
    }
    
    // Get all webhook data using pipeline for better performance with timeout
    const results = await executeWithTimeout(async () => {
      const pipeline = client.multi();
      for (const id of webhookIds) {
        pipeline.get(`webhook:${id}`);
      }
      return await pipeline.exec();
    });
    
    const webhooks: WebhookData[] = [];
    
    if (results) {
      for (const result of results) {
        if (result && result.length > 1 && result[1]) {
          try {
            const data = JSON.parse(result[1] as string);
            webhooks.push(data);
          } catch (parseError) {
            console.warn('Error parsing webhook data:', parseError);
          }
        }
      }
    }
    
    return webhooks;
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return [];
  }
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await executeWithTimeout(async () => {
      return await client.ping();
    }, 3000); // 3 second timeout for health check
    return true;
  } catch (error) {
    console.warn('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection() {
  if (redis) {
    try {
      await redis.quit();
      redis = null;
    } catch (error) {
      console.warn('Error closing Redis connection:', error);
    }
  }
}

// Delete webhook data
export async function deleteWebhookData(ids: string[]): Promise<void> {
  try {
    const client = await getRedisClient();
    
    // Delete webhook data and remove from timeline using pipeline with timeout
    await executeWithTimeout(async () => {
      const pipeline = client.multi();
      
      // Delete individual webhook records
      for (const id of ids) {
        pipeline.del(`webhook:${id}`);
      }
      
      // Remove from timeline sorted set
      for (const id of ids) {
        pipeline.zRem('webhooks:timeline', id);
      }
      
      return await pipeline.exec();
    });
  } catch (error) {
    console.error('Error deleting webhook data:', error);
    throw error;
  }
} 