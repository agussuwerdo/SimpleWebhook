# Simple Webhook Listener

A modern webhook listener application built with Next.js, Tailwind CSS, and Vercel Redis. Monitor and inspect incoming webhook requests in real-time with a clean, responsive UI.

## Features

- 🎯 **Universal Webhook Endpoint**: Accepts all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- 📊 **Real-time Dashboard**: View all incoming webhook requests with detailed information
- 🎨 **Modern UI**: Clean, responsive design built with Tailwind CSS
- 🗄️ **Redis Storage**: Persistent storage using Vercel Redis (KV)
- 🔄 **Auto-refresh**: Dashboard automatically updates every 30 seconds
- 📋 **Easy Copy**: One-click webhook URL copying
- 🏷️ **Request Details**: View HTTP method, URL, headers, body, and timestamp
- 📱 **Mobile Friendly**: Responsive design works on all devices

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd simple-webhook
npm install
```

### 2. Set up Vercel Redis

1. Create a Redis database in your Vercel dashboard
2. Update the Redis connection URL in `lib/redis.ts` with your credentials

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 4. Test Your Webhook

Your webhook endpoint will be available at:
```
http://localhost:3000/api/webhook
```

Test it with curl:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, webhook!", "timestamp": "2024-01-01T00:00:00Z"}'
```

## Deployment to Vercel

### 1. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### 2. Set up Environment Variables

If you need to use environment variables for your Redis connection, add them in your Vercel dashboard:

- Go to your project settings
- Add environment variables as needed
- Redeploy if necessary

### 3. Your Live Webhook URL

After deployment, your webhook will be available at:
```
https://your-app-name.vercel.app/api/webhook
```

## Project Structure

```
├── components/
│   └── WebhookCard.tsx     # Individual webhook display component
├── lib/
│   └── redis.ts            # Redis connection and utilities
├── pages/
│   ├── api/
│   │   ├── webhook.ts      # Main webhook endpoint
│   │   └── webhooks.ts     # API to fetch stored webhooks
│   ├── _app.tsx            # Next.js app wrapper
│   └── index.tsx           # Homepage dashboard
├── styles/
│   └── globals.css         # Global styles with Tailwind
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## API Endpoints

### POST /api/webhook (and all other HTTP methods)

Accepts webhook requests and stores them in Redis.

**Response:**
```json
{
  "success": true,
  "message": "Webhook received and stored",
  "id": "uuid-here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/webhooks

Retrieves stored webhook data for the dashboard.

**Query Parameters:**
- `limit` (optional): Number of webhooks to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "method": "POST",
      "url": "/api/webhook",
      "headers": {...},
      "body": {...},
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

## Customization

### Redis Configuration

Update `lib/redis.ts` to modify:
- Connection settings
- Data retention period (currently 7 days)
- Storage keys and structure

### UI Styling

The UI uses Tailwind CSS. Customize:
- Colors and themes in `tailwind.config.js`
- Component styles in `components/WebhookCard.tsx`
- Layout in `pages/index.tsx`

### Webhook Processing

Modify `pages/api/webhook.ts` to:
- Add custom validation
- Transform incoming data
- Add authentication
- Integrate with other services

## Technologies Used

- **Next.js 14** - React framework with API routes
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Utility-first CSS framework
- **Redis** - Fast, in-memory data storage
- **Vercel** - Deployment and hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify your Redis connection
3. Ensure all dependencies are installed
4. Check Vercel deployment logs

 