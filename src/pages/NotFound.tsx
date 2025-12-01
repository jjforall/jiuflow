import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, RefreshCw, Mail, FileText, Clock } from "lucide-react";
import { SupportTicketDialog } from "@/components/SupportTicketDialog";

const NotFound = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const [countdown, setCountdown] = useState(10);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Auto redirect countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      window.location.href = "/";
    }
  }, [countdown]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-destructive/10 p-4 rounded-full">
              <FileText className="h-16 w-16 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-destructive">404</h1>
            <h2 className="text-2xl font-semibold">
              {language === "ja" ? "ページが見つかりません" : "Page Not Found"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ja" 
                ? "お探しのページは存在しないか、移動した可能性があります。" 
                : "The page you're looking for doesn't exist or has been moved."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {language === "ja" 
                ? `${countdown}秒後にホームへ自動的にリダイレクトします` 
                : `Redirecting to home in ${countdown} seconds`}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              variant="default"
              className="flex items-center gap-2"
            >
              <Link to="/">
                <Home className="h-4 w-4" />
                {language === "ja" ? "ホームへ戻る" : "Go Home"}
              </Link>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {language === "ja" ? "再読み込み" : "Reload"}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              {language === "ja" 
                ? "問題が解決しない場合" 
                : "If the problem persists"}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTicketDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {language === "ja" ? "サポートチケット作成" : "Create Ticket"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex items-center gap-2"
              >
                <Link to="/contact">
                  <Mail className="h-4 w-4" />
                  {language === "ja" ? "お問い合わせ" : "Contact Support"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SupportTicketDialog
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        errorType="404 Page Not Found"
        errorDetails={`Path: ${location.pathname}`}
      />
    </div>
  );
};

export default NotFound;
