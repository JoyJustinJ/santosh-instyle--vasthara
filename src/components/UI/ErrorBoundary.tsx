import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center text-danger">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-bold text-text-primary">Oops! Something went wrong.</h1>
            <p className="text-text-secondary text-sm">
              We encountered an unexpected error. Please try reloading the page. If the problem persists, contact support.
            </p>
          </div>
          {this.state.error && (
            <div className="w-full max-w-md bg-surface p-4 rounded-xl border border-border text-left overflow-auto max-h-32">
              <p className="text-xs text-danger font-mono font-bold break-all">
                {this.state.error.message}
              </p>
            </div>
          )}
          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw size={18} />
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
