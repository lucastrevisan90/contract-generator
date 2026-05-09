
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-50 p-8 flex flex-col items-center justify-center font-mono">
                    <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl p-8 border border-red-200">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">Something went wrong</h1>
                        <div className="bg-red-50 p-4 rounded border border-red-100 mb-6">
                            <h2 className="text-xl font-semibold text-red-800 mb-2">{this.state.error?.name}</h2>
                            <p className="text-red-700">{this.state.error?.message}</p>
                        </div>

                        {this.state.errorInfo && (
                            <details className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded border border-gray-200 overflow-auto max-h-96">
                                <summary className="cursor-pointer font-semibold mb-2 hover:text-gray-900">Component Stack</summary>
                                {this.state.errorInfo.componentStack}
                            </details>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
