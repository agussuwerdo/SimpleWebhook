import { WebhookData, storeWebhookData as storeInRedis, getAllWebhooks as getFromRedis, deleteWebhookData as deleteFromRedis } from './redis';
import { storeFallbackWebhook, getFallbackWebhooks, deleteFallbackWebhooks } from './fallback-storage';

export interface StorageResult {
  success: boolean;
  data: WebhookData[];
  storage: 'redis' | 'memory';
  error?: string;
}

export async function storeWebhook(data: WebhookData): Promise<{ success: boolean; storage: 'redis' | 'memory'; error?: string }> {
  // Always store in fallback first (immediate backup)
  storeFallbackWebhook(data);
  
  // Try Redis as secondary storage
  try {
    await storeInRedis(data);
    return { success: true, storage: 'redis' };
  } catch (error) {
    console.warn('Redis storage failed, using memory storage:', error instanceof Error ? error.message : 'Unknown error');
    return { success: true, storage: 'memory' };
  }
}

export async function getWebhooks(limit: number = 50): Promise<StorageResult> {
  // Try Redis first
  try {
    const redisData = await getFromRedis(limit);
    if (redisData.length > 0) {
      return {
        success: true,
        data: redisData,
        storage: 'redis'
      };
    }
  } catch (error) {
    console.warn('Redis fetch failed, using memory storage:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  // Fallback to memory storage
  const memoryData = getFallbackWebhooks(limit);
  return {
    success: true,
    data: memoryData,
    storage: 'memory'
  };
}

export async function deleteWebhooks(ids: string[]): Promise<{ success: boolean; storage: 'redis' | 'memory'; error?: string }> {
  // Always delete from fallback storage
  deleteFallbackWebhooks(ids);
  
  // Try Redis deletion
  try {
    await deleteFromRedis(ids);
    return { success: true, storage: 'redis' };
  } catch (error) {
    console.warn('Redis deletion failed, deleted from memory storage only:', error instanceof Error ? error.message : 'Unknown error');
    return { success: true, storage: 'memory' };
  }
} 