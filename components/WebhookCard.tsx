import { WebhookData } from '../lib/redis';

interface WebhookCardProps {
    webhook: WebhookData;
}

export default function WebhookCard({ webhook }: WebhookCardProps) {
    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const getMethodColor = (method: string) => {
        switch (method.toLowerCase()) {
            case 'get':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'post':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'put':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'delete':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'patch':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatHeaders = (headers: Record<string, string>) => {
        // Filter out common headers that are less important for display
        const filteredHeaders = Object.entries(headers).filter(([key]) =>
            !['connection', 'accept-encoding', 'cache-control'].includes(key.toLowerCase())
        );
        return filteredHeaders;
    };

    const formatBody = (body: any) => {
        if (!body) return 'No body';
        if (typeof body === 'string') return body;
        return JSON.stringify(body, null, 2);
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMethodColor(webhook.method)}`}>
                        {webhook.method}
                    </span>
                    <span className="text-sm text-gray-500">
                        {formatTimestamp(webhook.timestamp)}
                    </span>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                    ID: {webhook.id.slice(0, 8)}...
                </span>
            </div>

            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Request URL</h3>
                <code className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-800 block break-all">
                    {webhook.url}
                </code>
            </div>

            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Headers</h3>
                <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {formatHeaders(webhook.headers).length > 0 ? (
                        <div className="space-y-1">
                            {formatHeaders(webhook.headers).map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                    <span className="font-medium text-gray-600 w-32 flex-shrink-0">
                                        {key}:
                                    </span>
                                    <span className="text-gray-800 break-all ml-2">
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-500 text-sm">No headers</span>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Body/Payload</h3>
                <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                        {formatBody(webhook.body)}
                    </pre>
                </div>
            </div>
        </div>
    );
} 