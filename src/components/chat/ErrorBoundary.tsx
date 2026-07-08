"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  name?: string; // component name for logging
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A React Error Boundary that catches errors in its children,
 * prevents them from crashing the rest of the UI, and provides
 * a recovery mechanism.
 *
 * Usage:
 *   <ErrorBoundary name="LiveChat">
 *     <LiveChatView />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console for debugging
    const componentName = this.props.name || "Unknown";
    console.warn(`[ErrorBoundary:${componentName}]`, error.message, errorInfo);

    // Fire optional callback (e.g. to log to system_alerts)
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-accent-error/10 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-accent-error" />
          </div>
          <p className="text-sm font-semibold text-brand-navy mb-1">
            {this.props.name || "Something"} unavailable
          </p>
          <p className="text-xs text-gray-400 mb-4 max-w-[200px]">
            This feature encountered an error and couldn&apos;t load.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-navy/5 text-brand-navy text-xs font-semibold hover:bg-brand-navy/10 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
