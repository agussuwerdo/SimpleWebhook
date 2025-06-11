import { NextApiRequest, NextApiResponse } from 'next';
import { getWebhooks } from '../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await getWebhooks(limit);
    
    res.status(200).json({
      success: result.success,
      data: result.data,
      count: result.data.length,
      storage: result.storage,
      usingFallback: result.storage === 'memory',
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 