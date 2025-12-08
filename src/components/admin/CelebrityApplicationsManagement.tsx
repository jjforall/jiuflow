import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, User, Mail } from "lucide-react";

interface CelebrityApplication {
  id: string;
  display_name: string;
  username: string | null;
  bio: string | null;
  belt_history: any;
  titles: any;
  home_dojo: string | null;
  status: string;
  created_at: string;
  email: string | null;
}

export const CelebrityApplicationsManagement = () => {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['celebrity-applications'],
    queryFn: async () => {
      // Use get_celebrity_applications_masked() for secure access with audit logging
      const { data, error } = await supabase
        .rpc('get_celebrity_applications_masked');
      
      if (error) throw error;
      return data as CelebrityApplication[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-celebrity-application', {
        body: { applicationId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("申請が承認され、プロフィールが作成されました");
      queryClient.invalidateQueries({ queryKey: ['celebrity-applications'] });
    },
    onError: (error: Error) => {
      toast.error(`承認エラー: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from('celebrity_applications')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("申請が却下されました");
      queryClient.invalidateQueries({ queryKey: ['celebrity-applications'] });
    },
    onError: (error: Error) => {
      toast.error(`却下エラー: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />保留中</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />承認済み</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />却下済み</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  const pendingApplications = applications?.filter(app => app.status === 'pending') || [];
  const processedApplications = applications?.filter(app => app.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">有名人登録申請管理</h2>
        <p className="text-muted-foreground">
          有名柔術家の登録申請を承認・却下できます。承認すると自動的にプロフィールが作成されます。
        </p>
      </div>

      {pendingApplications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">保留中の申請 ({pendingApplications.length})</h3>
          {pendingApplications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {app.display_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {app.email}
                    </CardDescription>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p><strong>ユーザー名:</strong> {app.username || '未設定'}</p>
                  <p><strong>所属道場:</strong> {app.home_dojo || '未設定'}</p>
                  {app.bio && (
                    <div>
                      <strong>プロフィール:</strong>
                      <p className="text-sm text-muted-foreground mt-1">{app.bio}</p>
                    </div>
                  )}
                  {app.belt_history && Array.isArray(app.belt_history) && app.belt_history.length > 0 && (
                    <div>
                      <strong>帯履歴:</strong>
                      <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                        {app.belt_history.map((belt: any, idx: number) => (
                          <li key={idx}>
                            {belt.belt} {belt.year && `(${belt.year}年)`} {belt.instructor && `- ${belt.instructor}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {app.titles && Array.isArray(app.titles) && app.titles.length > 0 && (
                    <div>
                      <strong>タイトル:</strong>
                      <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                        {app.titles.map((title: any, idx: number) => (
                          <li key={idx}>
                            {title.title} {title.year && `(${title.year}年)`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => approveMutation.mutate(app.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    承認してプロフィール作成
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(app.id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    却下
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {processedApplications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">処理済みの申請 ({processedApplications.length})</h3>
          {processedApplications.map((app) => (
            <Card key={app.id} className="opacity-60">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {app.display_name}
                  </CardTitle>
                  {getStatusBadge(app.status)}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {applications?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            申請はありません
          </CardContent>
        </Card>
      )}
    </div>
  );
};
