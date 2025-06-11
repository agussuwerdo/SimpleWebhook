import { WebhookData } from './redis';

// In-memory storage as fallback
let fallbackWebhooks: WebhookData[] = [];

export function storeFallbackWebhook(data: WebhookData): void {
  // Add to beginning of array (most recent first)
  fallbackWebhooks.unshift(data);
  
  // Keep only last 100 webhooks to prevent memory issues
  if (fallbackWebhooks.length > 100) {
    fallbackWebhooks = fallbackWebhooks.slice(0, 100);
  }
}

export function getFallbackWebhooks(limit: number = 50): WebhookData[] {
  return fallbackWebhooks.slice(0, limit);
}

export function deleteFallbackWebhooks(ids: string[]): void {
  // Remove webhooks with matching IDs
  fallbackWebhooks = fallbackWebhooks.filter(webhook => !ids.includes(webhook.id));
}

export function clearFallbackStorage() {
  fallbackWebhooks = [];
} 