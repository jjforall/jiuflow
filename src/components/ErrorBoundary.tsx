import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, FileText, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupportTicketDialog } from './SupportTicketDialog';
import { LanguageProvider } from '@/contexts/LanguageContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isTicketDialogOpen: boolean;
  countdown: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private countdownInterval?: ReturnType<typeof setInterval>;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isTicketDialogOpen: false,
    countdown: 30,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null, countdown: 30 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
    
    // Start countdown for auto-retry
    this.startCountdown();
  }

  public componentWillUnmount() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown = () => {
    this.countdownInterval = setInterval(() => {
      this.setState((prevState) => {
        const newCountdown = prevState.countdown - 1;
        if (newCountdown <= 0) {
          this.handleReset();
          return { countdown: 30 };
        }
        return { countdown: newCountdown };
      });
    }, 1000);
  };

  private handleReset = () => {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.setState({ hasError: false, error: null, errorInfo: null, countdown: 30 });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleOpenTicketDialog = () => {
    this.setState({ isTicketDialogOpen: true });
  };

  private handleCloseTicketDialog = () => {
    this.setState({ isTicketDialogOpen: false });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-destructive/10 p-4 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">エラーが発生しました</h1>
              <p className="text-muted-foreground">
                申し訳ございません。予期しないエラーが発生しました。
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-muted p-4 rounded-lg text-left">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      スタックトレースを表示
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="h-4 w-4" />
              <span>{this.state.countdown}秒後に自動的に再試行します</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="default"
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                今すぐ再試行
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleReload}
                className="flex items-center gap-2"
              >
                ページを再読み込み
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                ホームへ戻る
              </Button>
            </div>

            <div className="pt-6 border-t mt-6">
              <p className="text-sm text-muted-foreground mb-3">
                問題が解決しない場合
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleOpenTicketDialog}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  サポートチケット作成
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/contact'}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  お問い合わせ
                </Button>
              </div>
            </div>
          </div>

          <LanguageProvider>
            <SupportTicketDialog
              open={this.state.isTicketDialogOpen}
              onOpenChange={this.handleCloseTicketDialog}
              errorType="Runtime Error"
              errorDetails={this.state.error?.toString() || "Unknown error"}
            />
          </LanguageProvider>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundaries in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) throw error;
  }, [error]);

  return setError;
};