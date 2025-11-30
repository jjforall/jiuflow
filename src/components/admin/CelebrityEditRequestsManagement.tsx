import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EditRequest {
  id: string;
  celebrity_id: string;
  requested_by: string;
  status: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  home_dojo: string | null;
  belt_history: any;
  titles: any;
  rejection_reason: string | null;
  created_at: string;
  celebrity: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  requester: {
    id: string;
    display_name: string | null;
    email: string | null;
  };
}

export const CelebrityEditRequestsManagement = () => {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingRequest, setViewingRequest] = useState<EditRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('celebrity_edit_requests')
        .select(`
          *,
          celebrity:celebrities!celebrity_edit_requests_celebrity_id_fkey(id, display_name, avatar_url),
          requester:profiles!celebrity_edit_requests_requested_by_fkey(id, display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('リクエストの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: EditRequest) => {
    if (!confirm('この編集リクエストを承認しますか？')) return;

    try {
      // Update celebrity with new data
      const updateData: any = {};
      if (request.display_name) updateData.display_name = request.display_name;
      if (request.bio !== null) updateData.bio = request.bio;
      if (request.avatar_url !== null) updateData.avatar_url = request.avatar_url;
      if (request.home_dojo !== null) updateData.home_dojo = request.home_dojo;
      if (request.belt_history) updateData.belt_history = request.belt_history;
      if (request.titles) updateData.titles = request.titles;

      const { error: updateError } = await supabase
        .from('celebrities')
        .update(updateData)
        .eq('id', request.celebrity_id);

      if (updateError) throw updateError;

      // Update request status
      const { error: statusError } = await supabase
        .from('celebrity_edit_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (statusError) throw statusError;

      toast.success('編集リクエストを承認しました');
      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('承認に失敗しました');
    }
  };

  const handleReject = async (request: EditRequest) => {
    if (!rejectionReason.trim()) {
      toast.error('却下理由を入力してください');
      return;
    }

    try {
      const { error } = await supabase
        .from('celebrity_edit_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('編集リクエストを却下しました');
      setIsDialogOpen(false);
      setRejectionReason("");
      setViewingRequest(null);
      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('却下に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">承認待ち</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">承認済み</Badge>;
      case 'rejected':
        return <Badge variant="destructive">却下</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">選手編集リクエスト管理</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">編集リクエストはありません</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.celebrity.avatar_url || undefined} />
                        <AvatarFallback>{request.celebrity.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {request.celebrity.display_name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          申請者: {request.requester.display_name || request.requester.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.display_name && (
                      <p><strong>表示名:</strong> {request.display_name}</p>
                    )}
                    {request.home_dojo && (
                      <p><strong>所属道場:</strong> {request.home_dojo}</p>
                    )}
                    {request.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{request.bio}</p>
                    )}
                  </div>
                  
                  {request.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(request)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        承認
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setViewingRequest(request);
                          setIsDialogOpen(true);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        却下
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingRequest(request);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        詳細
                      </Button>
                    </div>
                  )}
                  
                  {request.rejection_reason && (
                    <div className="mt-4 p-3 bg-destructive/10 rounded">
                      <p className="text-sm font-medium">却下理由:</p>
                      <p className="text-sm">{request.rejection_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編集リクエスト詳細</DialogTitle>
          </DialogHeader>

          {viewingRequest && (
            <div className="space-y-4">
              <div>
                <Label>表示名</Label>
                <p className="mt-1">{viewingRequest.display_name}</p>
              </div>

              <div>
                <Label>プロフィール画像URL</Label>
                <p className="mt-1 text-sm break-all">{viewingRequest.avatar_url || '未設定'}</p>
              </div>

              <div>
                <Label>自己紹介</Label>
                <p className="mt-1 whitespace-pre-wrap">{viewingRequest.bio || '未設定'}</p>
              </div>

              <div>
                <Label>所属道場</Label>
                <p className="mt-1">{viewingRequest.home_dojo || '未設定'}</p>
              </div>

              <div>
                <Label>帯履歴</Label>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {JSON.stringify(viewingRequest.belt_history, null, 2)}
                </pre>
              </div>

              <div>
                <Label>タイトル</Label>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {JSON.stringify(viewingRequest.titles, null, 2)}
                </pre>
              </div>

              {viewingRequest.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <Label>却下理由（却下する場合）</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="却下する理由を入力してください..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => {
                        handleApprove(viewingRequest);
                        setIsDialogOpen(false);
                      }}
                    >
                      承認
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(viewingRequest)}
                    >
                      却下
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
