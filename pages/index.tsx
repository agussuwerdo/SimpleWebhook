import { useState, useEffect } from 'react';
import Head from 'next/head';
import WebhookCard from '../components/WebhookCard';
import { WebhookData } from '../lib/redis';

export default function Home() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [storageType, setStorageType] = useState<string>('redis');

    const fetchWebhooks = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/webhooks');
            const data = await response.json();

                  if (data.success) {
        setWebhooks(data.data);
        setStorageType(data.storage || 'redis');
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch webhooks');
      }
        } catch (err) {
            setError('Failed to fetch webhooks');
            console.error('Error fetching webhooks:', err);
        } finally {
            setLoading(false);
        }
    };

      useEffect(() => {
    // Set webhook URL on client side
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhook`);
    }
    
    fetchWebhooks();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchWebhooks, 30000);
    return () => clearInterval(interval);
  }, []);

    const handleRefresh = () => {
        fetchWebhooks();
    };

      const copyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      alert('Webhook URL copied to clipboard!');
    }
  };

    return (
        <>
            <Head>
                <title>Simple Webhook Listener</title>
                <meta name="description" content="A simple webhook listener app built with Next.js" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="min-h-screen bg-gray-50">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Simple Webhook Listener
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Monitor and inspect incoming webhook requests in real-time
                        </p>

                                     {/* Webhook URL and Controls */}
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
               <div className="flex flex-col gap-4">
                 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                   <div className="flex-1">
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Your Webhook URL:
                     </label>
                     <div className="flex items-center space-x-2">
                       <code className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-800 flex-1 break-all">
                         {webhookUrl || 'Loading...'}
                       </code>
                       <button
                         onClick={copyWebhookUrl}
                         className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                       >
                         Copy URL
                       </button>
                     </div>
                   </div>
                   <button
                     onClick={handleRefresh}
                     disabled={loading}
                     className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                   >
                     {loading ? 'Refreshing...' : 'Refresh'}
                   </button>
                 </div>
               </div>
             </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                                          <h2 className="text-2xl font-semibold text-gray-900">
                Recent Webhooks ({webhooks.length})
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Auto-refreshes every 30 seconds
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  storageType === 'redis' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {storageType === 'redis' ? '🗄️ Redis' : '💾 Memory'}
                </span>
              </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && webhooks.length === 0 && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading webhooks...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && webhooks.length === 0 && (
                        <div className="text-center py-12">
                            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks yet</h3>
                            <p className="text-gray-600 mb-4">
                                Send a request to your webhook URL to see it appear here
                            </p>
                            <div className="bg-gray-100 rounded-lg p-4 max-w-2xl mx-auto">
                                <p className="text-sm text-gray-700 mb-2">Try this example:</p>
                                                 <code className="block bg-white p-3 rounded text-sm text-gray-800 break-all">
                    curl -X POST {webhookUrl || 'YOUR_DOMAIN/api/webhook'} {'\\'}<br />
                    &nbsp;&nbsp;-H "Content-Type: application/json" {'\\'}<br />
                    &nbsp;&nbsp;-d {`'{"message": "Hello, webhook!"}'`}
                 </code>
                            </div>
                        </div>
                    )}

                    {/* Webhooks List */}
                    {webhooks.length > 0 && (
                        <div className="space-y-4">
                            {webhooks.map((webhook) => (
                                <WebhookCard key={webhook.id} webhook={webhook} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 