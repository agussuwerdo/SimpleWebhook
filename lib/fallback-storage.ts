import { WebhookData } from './redis';

// In-memory fallback storage
let webhookStorage: WebhookData[] = [];
const MAX_WEBHOOKS = 100;

export function storeFallbackWebhook(data: WebhookData) {
  webhookStorage.unshift(data);
  
  // Keep only the most recent webhooks
  if (webhookStorage.length > MAX_WEBHOOKS) {
    webhookStorage = webhookStorage.slice(0, MAX_WEBHOOKS);
  }
}

export function getFallbackWebhooks(limit: number = 50): WebhookData[] {
  return webhookStorage.slice(0, limit);
}

export function clearFallbackStorage() {
  webhookStorage = [];
} 