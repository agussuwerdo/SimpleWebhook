import { NextApiRequest, NextApiResponse } from 'next';
import { getWebhooks, deleteWebhooks } from '../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { data, storage } = await getWebhooks();
      res.status(200).json({
        success: true,
        data,
        storage
      });
    } catch (error) {
      console.error('Error in webhooks API:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch webhooks',
        data: []
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook IDs provided'
        });
      }

      const { success, storage } = await deleteWebhooks(ids);
      
      if (success) {
        res.status(200).json({
          success: true,
          message: `Successfully deleted ${ids.length} webhook(s)`,
          storage
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete webhooks'
        });
      }
    } catch (error) {
      console.error('Error deleting webhooks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete webhooks'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });
  }
} 