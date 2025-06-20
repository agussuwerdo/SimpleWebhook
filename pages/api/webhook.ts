import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { WebhookData } from '../../lib/redis';
import { storeWebhook } from '../../lib/storage';
import { broadcastWebhook } from './webhook-stream';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Create webhook data object
    const webhookData: WebhookData = {
      id: uuidv4(),
      method: req.method || 'UNKNOWN',
      url: req.url || '',
      headers: req.headers as Record<string, string>,
      body: req.body,
      timestamp: new Date().toISOString(),
    };

    // Store webhook data using unified storage
    const storageResult = await storeWebhook(webhookData);

    // Broadcast to SSE clients
    broadcastWebhook(webhookData);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook received and stored',
      id: webhookData.id,
      timestamp: webhookData.timestamp,
      storage: storageResult.storage,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Allow all HTTP methods
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
} 