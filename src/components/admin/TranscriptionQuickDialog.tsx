import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle, ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  video_url: string | null;
  series_prefix?: string | null;
  series_order?: number | null;
}

interface Transcription {
  id: string;
  technique_id: string | null;
  language_code: string;
  original_text: string;
  edited_text: string | null;
  status: string;
  created_at: string;
}

interface TranscriptionQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technique: Technique | null;
  transcription?: Transcription | null;
  onTranscriptionComplete?: () => void;
}

export function TranscriptionQuickDialog({
  open,
  onOpenChange,
  technique,
  transcription,
  onTranscriptionComplete,
}: TranscriptionQuickDialogProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleTranscribe = async () => {
    if (!technique?.video_url) {
      toast.error('動画URLがありません');
      return;
    }

    setIsTranscribing(true);

    try {
      const { data, error } = await supabase.functions.invoke('transcribe-video', {
        body: {
          videoUrl: technique.video_url,
          techniqueId: technique.id,
        },
      });

      if (error) {
        // Check if transcription was actually saved despite the error (timeout case)
        const isTimeoutError = error.message?.includes('connection closed') || 
                               error.message?.includes('timeout') ||
                               error.message?.includes('FunctionsFetchError');
        
        if (isTimeoutError) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: checkData } = await supabase
            .from('video_transcriptions')
            .select('id, status')
            .eq('technique_id', technique.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (checkData) {
            toast.success(`「${technique.name_ja || technique.name}」の文字起こしが完了しました`);
            onTranscriptionComplete?.();
            onOpenChange(false);
            return;
          }
        }
        
        throw new Error(error.message);
      }

      toast.success(`「${technique.name_ja || technique.name}」の文字起こしが完了しました`);
      onTranscriptionComplete?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Transcription error:', error);
      
      // Final check
      const { data: finalCheck } = await supabase
        .from('video_transcriptions')
        .select('id')
        .eq('technique_id', technique.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (finalCheck) {
        toast.success(`「${technique.name_ja || technique.name}」の文字起こしが完了しました`);
        onTranscriptionComplete?.();
        onOpenChange(false);
      } else {
        toast.error(`文字起こしエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  if (!technique) return null;

  const hasTranscription = !!transcription;
  const transcriptPreview = transcription?.edited_text || transcription?.original_text;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            字幕・文字起こし
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Technique Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="font-medium">{technique.name_ja || technique.name}</div>
            {technique.series_prefix && (
              <div className="text-sm text-muted-foreground">
                {technique.series_prefix}-{technique.series_order}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">ステータス:</span>
            {hasTranscription ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                完了
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                未作成
              </Badge>
            )}
          </div>

          {/* Transcription Preview */}
          {hasTranscription && transcriptPreview && (
            <div className="space-y-2">
              <div className="text-sm font-medium">文字起こしプレビュー:</div>
              <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto text-sm">
                {transcriptPreview.slice(0, 500)}
                {transcriptPreview.length > 500 && '...'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {hasTranscription ? (
              <>
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/admin/transcriptions/${transcription?.id}`}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    詳細編集
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  className="flex-1"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      再生成
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleTranscribe}
                disabled={isTranscribing || !technique.video_url}
                className="w-full"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    文字起こし中...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    文字起こしを開始
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
