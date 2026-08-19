import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950 p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-rose-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-slate-500 dark:text-neutral-400 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors"
            >
              <RefreshCw size={18} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
