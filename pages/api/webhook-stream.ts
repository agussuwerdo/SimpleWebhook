import { NextApiRequest, NextApiResponse } from 'next';

// Store active SSE connections
const clients = new Set<NextApiResponse>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Add this client to the set
  clients.add(res);
  console.log(`New SSE client connected. Total clients: ${clients.size}`);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connected' })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    clients.delete(res);
    console.log(`SSE client disconnected (close). Total clients: ${clients.size}`);
  });

  req.on('end', () => {
    clients.delete(res);
    console.log(`SSE client ended. Total clients: ${clients.size}`);
  });

  // Handle aborted connections
  req.on('aborted', () => {
    clients.delete(res);
    console.log(`SSE client aborted. Total clients: ${clients.size}`);
  });

  // Set up periodic heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
    } catch (error) {
      console.log('Heartbeat failed, removing client');
      clients.delete(res);
      clearInterval(heartbeat);
    }
  }, 30000); // Send heartbeat every 30 seconds

  // Clean up heartbeat on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
}

// Function to broadcast webhook data to all connected clients
export function broadcastWebhook(webhookData: any) {
  console.log(`Broadcasting webhook to ${clients.size} connected clients:`, webhookData.id);
  
  const message = JSON.stringify({
    type: 'webhook',
    data: webhookData
  });

  // Send to all connected clients
  clients.forEach((client) => {
    try {
      client.write(`data: ${message}\n\n`);
      console.log('Successfully sent webhook data to client');
    } catch (error) {
      console.log('Failed to send to client, removing connection:', error);
      // Remove dead connections
      clients.delete(client);
    }
  });
}

// Function to broadcast webhook deletion to all connected clients
export function broadcastWebhookDeletion(deletedIds: string[]) {
  const message = JSON.stringify({
    type: 'webhook-deleted',
    data: { ids: deletedIds }
  });

  clients.forEach((client) => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      clients.delete(client);
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 