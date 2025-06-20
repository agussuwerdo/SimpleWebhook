import { WebhookData, storeWebhookData as storeInRedis, getAllWebhooks as getFromRedis, deleteWebhookData as deleteFromRedis, checkRedisHealth } from './redis';
import { storeFallbackWebhook, getFallbackWebhooks, deleteFallbackWebhooks } from './fallback-storage';

export interface StorageResult {
  success: boolean;
  data: WebhookData[];
  storage: 'redis' | 'memory';
  error?: string;
}

// Cache the storage type decision for a short period to avoid constant health checks
let storageType: 'redis' | 'memory' | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

async function determineStorageType(): Promise<'redis' | 'memory'> {
  const now = Date.now();
  
  // Use cached result if it's recent
  if (storageType && (now - lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    return storageType;
  }
  
  // Check Redis health
  try {
    const isHealthy = await checkRedisHealth();
    storageType = isHealthy ? 'redis' : 'memory';
    lastHealthCheck = now;
    
    if (!isHealthy) {
      console.warn('Redis health check failed, using memory storage');
    }
    
    return storageType;
  } catch (error) {
    console.warn('Redis health check error, using memory storage:', error instanceof Error ? error.message : 'Unknown error');
    storageType = 'memory';
    lastHealthCheck = now;
    return 'memory';
  }
}

export async function storeWebhook(data: WebhookData): Promise<{ success: boolean; storage: 'redis' | 'memory'; error?: string }> {
  const storage = await determineStorageType();
  
  // Always store in fallback memory as backup
  storeFallbackWebhook(data);
  
  if (storage === 'redis') {
    try {
      await storeInRedis(data);
      return { success: true, storage: 'redis' };
    } catch (error) {
      console.warn('Redis storage failed after health check passed, falling back to memory:', error instanceof Error ? error.message : 'Unknown error');
      // Force re-check on next operation
      storageType = null;
      return { success: true, storage: 'memory' };
    }
  } else {
    // Use memory storage
    return { success: true, storage: 'memory' };
  }
}

export async function getWebhooks(limit: number = 50): Promise<StorageResult> {
  const storage = await determineStorageType();
  
  if (storage === 'redis') {
    try {
      const redisData = await getFromRedis(limit);
      return {
        success: true,
        data: redisData,
        storage: 'redis'
      };
    } catch (error) {
      console.warn('Redis fetch failed after health check passed, falling back to memory:', error instanceof Error ? error.message : 'Unknown error');
      // Force re-check on next operation
      storageType = null;
    }
  }
  
  // Use memory storage
  const memoryData = getFallbackWebhooks(limit);
  return {
    success: true,
    data: memoryData,
    storage: 'memory'
  };
}

export async function deleteWebhooks(ids: string[]): Promise<{ success: boolean; storage: 'redis' | 'memory'; error?: string }> {
  const storage = await determineStorageType();
  
  // Always delete from fallback memory
  deleteFallbackWebhooks(ids);
  
  if (storage === 'redis') {
    try {
      await deleteFromRedis(ids);
      return { success: true, storage: 'redis' };
    } catch (error) {
      console.warn('Redis deletion failed after health check passed, using memory only:', error instanceof Error ? error.message : 'Unknown error');
      // Force re-check on next operation
      storageType = null;
      return { success: true, storage: 'memory' };
    }
  } else {
    // Use memory storage
    return { success: true, storage: 'memory' };
  }
} 