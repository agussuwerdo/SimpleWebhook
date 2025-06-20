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
  const [selectedWebhooks, setSelectedWebhooks] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [newWebhookIds, setNewWebhookIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

    const fetchWebhooks = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/webhooks');
            const data = await response.json();

                  if (data.success) {
        setWebhooks(data.data);
        setStorageType(data.storage || 'redis');
        setError(null);
        // Clear selection if webhooks changed
        setSelectedWebhooks(new Set());
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
    
    // Initial fetch
    fetchWebhooks();
    
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;
    
    const setupSSE = () => {
      if (!isComponentMounted) return;
      
      console.log('Setting up SSE connection...');
      eventSource = new EventSource('/api/webhook-stream');
      
      eventSource.onopen = () => {
        if (!isComponentMounted) return;
        console.log('SSE connection opened');
        setSseConnected(true);
        setError(null);
      };
      
      eventSource.onmessage = (event) => {
        if (!isComponentMounted) return;
        
        try {
          console.log('SSE message received:', event.data);
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('SSE connected:', data.message);
          } else if (data.type === 'heartbeat') {
            // Heartbeat received, connection is alive
            console.log('SSE heartbeat received');
          } else if (data.type === 'webhook') {
            console.log('New webhook received via SSE:', data.data.id);
            // Add new webhook to the beginning of the list
            setWebhooks(prev => {
              console.log('Adding webhook to list, current count:', prev.length);
              return [data.data, ...prev];
            });
            // Mark as new for animation
            setNewWebhookIds(prev => new Set(Array.from(prev).concat(data.data.id)));
            // Remove the "new" status after 3 seconds
            setTimeout(() => {
              if (!isComponentMounted) return;
              setNewWebhookIds(prev => {
                const updated = new Set(prev);
                updated.delete(data.data.id);
                return updated;
              });
            }, 3000);
          } else if (data.type === 'webhook-deleted') {
            console.log('Webhook deletion received via SSE:', data.data.ids);
            // Remove deleted webhooks from the list
            setWebhooks(prev => prev.filter(webhook => !data.data.ids.includes(webhook.id)));
            // Clear selections for deleted items
            setSelectedWebhooks(prev => {
              const newSelected = new Set(prev);
              data.data.ids.forEach((id: string) => newSelected.delete(id));
              return newSelected;
            });
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        if (!isComponentMounted) return;
        
        setSseConnected(false);
        
        // Close the failed connection
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Try to reconnect after a delay
        reconnectTimeout = setTimeout(() => {
          if (isComponentMounted) {
            console.log('Attempting to reconnect SSE...');
            setupSSE();
          }
        }, 3000);
      };
    };
    
    // Initial SSE setup
    setupSSE();
    
    return () => {
      console.log('Cleaning up SSE connection...');
      isComponentMounted = false;
      setSseConnected(false);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };
  }, []);

    const handleRefresh = () => {
        fetchWebhooks();
    };

      const copyWebhookUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      showToast('Webhook URL copied to clipboard!');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleWebhookSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedWebhooks);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedWebhooks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedWebhooks.size === webhooks.length) {
      // Deselect all
      setSelectedWebhooks(new Set());
    } else {
      // Select all
      setSelectedWebhooks(new Set(webhooks.map(w => w.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedWebhooks.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedWebhooks.size} selected webhook(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      const response = await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedWebhooks)
        }),
      });

      const data = await response.json();

      if (data.success) {
        // No need to refresh - SSE will handle the update
        // Just clear the selection as SSE will remove the webhooks
        setSelectedWebhooks(new Set());
      } else {
        setError(data.message || 'Failed to delete webhooks');
      }
    } catch (err) {
      setError('Failed to delete webhooks');
      console.error('Error deleting webhooks:', err);
    } finally {
      setDeleting(false);
    }
  };

    return (
        <>
            <Head>
                <title>Webhook Monitor - Real-time Webhook Inspector</title>
                <meta name="description" content="Professional webhook monitoring and inspection tool with real-time updates" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Navigation Header */}
                <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        Webhook Monitor
                                    </h1>
                                    <p className="text-xs text-gray-500">Real-time Inspector</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                                    sseConnected 
                                        ? 'bg-green-100 text-green-700 border border-green-200' 
                                        : 'bg-orange-100 text-orange-700 border border-orange-200'
                                }`}>
                                    <div className={`w-2 h-2 rounded-full ${
                                        sseConnected ? 'bg-green-500 animate-pulse' : 'bg-orange-500'
                                    }`}></div>
                                    <span>{sseConnected ? 'Live' : 'Connecting...'}</span>
                                </div>
                                <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                                    storageType === 'redis' 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {storageType === 'redis' ? '🗄️ Redis' : '💾 Memory'}
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="container mx-auto px-4 py-8">
                    {/* Hero Section */}
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Monitor Webhooks in 
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Real-time</span>
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Inspect, debug, and monitor incoming webhook requests with instant notifications and detailed payload analysis
                        </p>
                    </div>

                    {/* Webhook URL Card */}
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Your Webhook Endpoint</h3>
                                <p className="text-sm text-gray-600">Send POST requests to this URL to test webhooks</p>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-200">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <code className="text-sm font-mono text-gray-800 flex-1 break-all bg-white px-4 py-3 rounded-lg border">
                                    {webhookUrl || 'Loading...'}
                                </code>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={copyWebhookUrl}
                                        className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>Copy</span>
                                    </button>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="px-4 py-3 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center space-x-2"
                                    >
                                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Test Section */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Quick Test</span>
                            </h4>
                            <p className="text-sm text-blue-700 mb-3">Try this curl command to send a test webhook:</p>
                            <code className="block bg-white p-3 rounded-lg text-xs font-mono text-gray-800 border border-blue-200 overflow-x-auto">
                                curl -X POST {webhookUrl || 'YOUR_WEBHOOK_URL'} \<br />
                                &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                                &nbsp;&nbsp;-d {`'{"message": "Hello from webhook!", "timestamp": "'$(date)'"}'`}
                            </code>
                        </div>
                    </div>

                    {/* Webhooks Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        Recent Webhooks
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {webhooks.length} {webhooks.length === 1 ? 'request' : 'requests'} captured
                                    </p>
                                </div>
                            </div>
                            
                            {/* Stats Cards */}
                            <div className="flex items-center space-x-4">
                                <div className="bg-white/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                                    <div className="text-xs text-gray-500">Total</div>
                                    <div className="text-lg font-bold text-gray-900">{webhooks.length}</div>
                                </div>
                                {selectedWebhooks.size > 0 && (
                                    <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
                                        <div className="text-xs text-blue-600">Selected</div>
                                        <div className="text-lg font-bold text-blue-700">{selectedWebhooks.size}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Bar */}
                        {webhooks.length > 0 && (
                            <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={handleSelectAll}
                                            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{selectedWebhooks.size === webhooks.length ? 'Deselect All' : 'Select All'}</span>
                                        </button>
                                        
                                        {selectedWebhooks.size > 0 && (
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{selectedWebhooks.size} webhook{selectedWebhooks.size !== 1 ? 's' : ''} selected</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-3">
                                        {selectedWebhooks.size > 0 && (
                                            <button
                                                onClick={handleDeleteSelected}
                                                disabled={deleting}
                                                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span>{deleting ? 'Deleting...' : `Delete (${selectedWebhooks.size})`}</span>
                                            </button>
                                        )}
                                        
                                        <button
                                            onClick={handleRefresh}
                                            disabled={loading}
                                            className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Refresh</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && webhooks.length === 0 && (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-6">
                                <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Webhooks</h3>
                            <p className="text-gray-600">Fetching your webhook history...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6 mb-6">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800 mb-1">Connection Issue</h3>
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && webhooks.length === 0 && (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 p-12 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-6">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Receive Webhooks</h3>
                            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                Your webhook endpoint is live and waiting for incoming requests. Send a test webhook to get started!
                            </p>
                            
                            {/* Enhanced Example Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 max-w-3xl mx-auto border border-blue-100">
                                <div className="flex items-center justify-center space-x-2 mb-4">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <h4 className="font-semibold text-blue-900">Try This Example</h4>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-blue-200">
                                    <code className="block text-sm font-mono text-gray-800 leading-relaxed">
                                        <span className="text-blue-600">curl</span> -X POST {webhookUrl || 'YOUR_WEBHOOK_URL'} \<br />
                                        &nbsp;&nbsp;<span className="text-green-600">-H</span> <span className="text-orange-600">&quot;Content-Type: application/json&quot;</span> \<br />
                                        &nbsp;&nbsp;<span className="text-green-600">-d</span> <span className="text-orange-600">&quot;{`'{"event": "test", "message": "Hello from webhook!", "timestamp": "'$(date)'"}'`}&quot;</span>
                                    </code>
                                </div>
                                <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-blue-700">
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span>Real-time updates</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                        <span>Instant notifications</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                        <span>Detailed inspection</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Webhooks List */}
                    {webhooks.length > 0 && (
                        <div className="space-y-6">
                            {webhooks.map((webhook) => (
                                <WebhookCard 
                                  key={webhook.id} 
                                  webhook={webhook}
                                  isSelected={selectedWebhooks.has(webhook.id)}
                                  onSelect={handleWebhookSelect}
                                  isNew={newWebhookIds.has(webhook.id)}
                                  onToast={showToast}
                                />
                            ))}
                        </div>
                    )}

                    {/* Toast Notification */}
                    {toastMessage && (
                        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white/90 backdrop-blur-sm border border-green-200 rounded-xl shadow-lg p-4 flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700">{toastMessage}</span>
                                <button
                                    onClick={() => setToastMessage(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 