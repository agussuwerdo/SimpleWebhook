import { WebhookData } from '../lib/redis';

interface WebhookCardProps {
    webhook: WebhookData;
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
    isNew?: boolean;
    onToast?: (message: string) => void;
}

export default function WebhookCard({ webhook, isSelected = false, onSelect, isNew = false, onToast }: WebhookCardProps) {
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

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            if (onToast) {
                onToast(`${label} copied to clipboard!`);
            }
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            if (onToast) {
                onToast('Failed to copy to clipboard');
            }
        });
    };

    const copyUrl = () => {
        copyToClipboard(webhook.url, 'URL');
    };

    const copyHeaders = () => {
        const headersText = formatHeaders(webhook.headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        copyToClipboard(headersText || 'No headers', 'Headers');
    };

    const copyBody = () => {
        copyToClipboard(formatBody(webhook.body), 'Body');
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onSelect) {
            onSelect(webhook.id, e.target.checked);
        }
    };

    return (
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl ${
            isSelected ? 'border-blue-300 bg-blue-50/80 ring-2 ring-blue-200' : 'border-white/30'
        } ${isNew ? 'ring-2 ring-green-300 bg-green-50/80 animate-pulse' : ''}`}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {onSelect && (
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={handleCheckboxChange}
                                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md transition-colors"
                                />
                            </div>
                        )}
                        <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 ${getMethodColor(webhook.method)}`}>
                                {webhook.method}
                            </span>
                            {isNew && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200 animate-pulse">
                                    New
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="text-right">
                            <div className="text-sm font-medium text-gray-700">
                                {formatTimestamp(webhook.timestamp)}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                                {webhook.id.slice(0, 8)}...
                            </div>
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {/* URL Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <h3 className="text-sm font-semibold text-gray-800">Request URL</h3>
                        </div>
                        <button
                            onClick={copyUrl}
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border border-blue-200 hover:border-blue-300"
                            title="Copy URL"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <code className="text-sm text-gray-800 font-mono break-all">
                            {webhook.url}
                        </code>
                    </div>
                </div>

                {/* Headers Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-sm font-semibold text-gray-800">Headers</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {formatHeaders(webhook.headers).length}
                            </span>
                        </div>
                        <button
                            onClick={copyHeaders}
                            className="flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors border border-purple-200 hover:border-purple-300"
                            title="Copy Headers"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 max-h-48 overflow-y-auto">
                        {formatHeaders(webhook.headers).length > 0 ? (
                            <div className="space-y-2">
                                {formatHeaders(webhook.headers).map(([key, value]) => (
                                    <div key={key} className="flex items-start text-sm">
                                        <span className="font-semibold text-purple-700 min-w-0 flex-shrink-0 w-32">
                                            {key}:
                                        </span>
                                        <span className="text-gray-700 break-all ml-3 font-mono">
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-4">
                                <span className="text-gray-500 text-sm italic">No headers present</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Body Section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <h3 className="text-sm font-semibold text-gray-800">Payload</h3>
                        </div>
                        <button
                            onClick={copyBody}
                            className="flex items-center space-x-1 text-xs text-green-600 hover:text-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors border border-green-200 hover:border-green-300"
                            title="Copy Body"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 max-h-64 overflow-y-auto">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
                            {formatBody(webhook.body)}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
} 