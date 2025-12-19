import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Languages, Mic, Edit, Save, X, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

interface Transcription {
  id: string;
  technique_id: string | null;
  user_video_id: string | null;
  language_code: string;
  original_text: string;
  edited_text: string | null;
  segments: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  video_url: string | null;
  series_prefix: string | null;
  series_order: number | null;
}

export const TranscriptionManagement = () => {
  const { t } = useTranslation();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [transcriptions, setTranscriptions] = useState<Record<string, Transcription>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [editingTranscription, setEditingTranscription] = useState<Transcription | null>(null);
  const [editedText, setEditedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch techniques with video URLs
      const { data: techniquesData, error: techError } = await supabase
        .from('techniques')
        .select('id, name, name_ja, video_url, series_prefix, series_order')
        .not('video_url', 'is', null)
        .order('series_prefix', { ascending: true })
        .order('series_order', { ascending: true });

      if (techError) throw techError;
      setTechniques(techniquesData || []);

      // Fetch existing transcriptions
      const { data: transcriptionsData, error: transError } = await supabase
        .from('video_transcriptions')
        .select('*');

      if (transError) throw transError;

      // Map transcriptions by technique_id
      const transMap: Record<string, Transcription> = {};
      transcriptionsData?.forEach(t => {
        if (t.technique_id) {
          transMap[t.technique_id] = t;
        }
      });
      setTranscriptions(transMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribe = async (technique: Technique) => {
    if (!technique.video_url) {
      toast.error('動画URLがありません');
      return;
    }

    setTranscribingIds(prev => new Set(prev).add(technique.id));

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
          // Wait a moment and check if transcription was saved
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
            fetchData();
            return;
          }
        }
        
        // Try to extract server error body for better debugging
        let message = error.message;
        const anyErr = error as any;
        if (anyErr?.context?.json) {
          try {
            const body = await anyErr.context.json();
            if (body?.error) message = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(message);
      }

      toast.success(`「${technique.name_ja || technique.name}」の文字起こしが完了しました`);
      fetchData();
    } catch (error: any) {
      console.error('Transcription error:', error);
      
      // Final check - maybe it was saved anyway
      const { data: finalCheck } = await supabase
        .from('video_transcriptions')
        .select('id')
        .eq('technique_id', technique.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (finalCheck) {
        toast.success(`「${technique.name_ja || technique.name}」の文字起こしが完了しました`);
        fetchData();
      } else {
        toast.error(`文字起こしエラー: ${error.message}`);
      }
    } finally {
      setTranscribingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(technique.id);
        return newSet;
      });
    }
  };

  const handleEditTranscription = (transcription: Transcription) => {
    setEditingTranscription(transcription);
    setEditedText(transcription.edited_text || transcription.original_text);
  };

  const handleSaveTranscription = async () => {
    if (!editingTranscription) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('video_transcriptions')
        .update({ edited_text: editedText })
        .eq('id', editingTranscription.id);

      if (error) throw error;

      // Regenerate VTT from edited text
      const segments = parseTextToSegments(editedText, editingTranscription.segments);
      const vttContent = generateVTT(segments);

      // Update subtitle
      await supabase
        .from('video_subtitles')
        .upsert({
          transcription_id: editingTranscription.id,
          language_code: 'ja',
          vtt_content: vttContent,
          status: 'completed',
        }, { onConflict: 'transcription_id,language_code' });

      toast.success('文字起こしを保存しました');
      setEditingTranscription(null);
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`保存エラー: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const parseTextToSegments = (text: string, originalSegments: any[]) => {
    // Simple approach: use original timings with updated text
    // In production, you'd want more sophisticated text alignment
    const lines = text.split('\n').filter(l => l.trim());
    return originalSegments.map((seg, i) => ({
      ...seg,
      text: lines[i] || seg.text,
    }));
  };

  // Split long text into lines of max ~18 characters for Japanese readability
  const splitTextForSubtitle = (text: string, maxCharsPerLine: number = 18): string => {
    const trimmed = text.trim().replace(/\s+/g, ''); // Remove spaces for Japanese
    if (trimmed.length <= maxCharsPerLine) return trimmed;
    
    // Try to split at natural break points (punctuation)
    const breakPoints = ['。', '、', '！', '？', 'ー', '…'];
    const lines: string[] = [];
    let remaining = trimmed;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxCharsPerLine) {
        lines.push(remaining);
        break;
      }
      
      // Look for natural break point within the maxCharsPerLine range
      let breakIndex = -1;
      for (let i = Math.min(maxCharsPerLine - 1, remaining.length - 1); i >= maxCharsPerLine / 2; i--) {
        if (breakPoints.includes(remaining[i])) {
          breakIndex = i + 1;
          break;
        }
      }
      
      // If no natural break found, just split at maxCharsPerLine
      if (breakIndex === -1) {
        breakIndex = maxCharsPerLine;
      }
      
      lines.push(remaining.slice(0, breakIndex));
      remaining = remaining.slice(breakIndex);
    }
    
    // Limit to 2 lines max for readability
    if (lines.length > 2) {
      return lines.slice(0, 2).join('\n');
    }
    
    return lines.join('\n');
  };

  const generateVTT = (segments: any[]): string => {
    // VTT header with STYLE block for consistent subtitle appearance
    let vtt = `WEBVTT

STYLE
::cue {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 1.1em;
  line-height: 1.4;
  text-shadow: 1px 1px 2px black;
}

`;
    let cueIndex = 1;
    
    // Split long segments into smaller chunks for subtitle display
    const maxSegmentDuration = 4; // Max 4 seconds per subtitle
    const maxChars = 30; // Max chars per subtitle (before line breaking)

    for (const segment of segments) {
      const text = segment.text.trim().replace(/\s+/g, ''); // Clean up for Japanese
      const duration = segment.end - segment.start;
      
      // If segment is short enough, output as single cue
      if (duration <= maxSegmentDuration && text.length <= maxChars) {
        const startTime = formatVTTTime(segment.start);
        const endTime = formatVTTTime(segment.end);
        vtt += `${cueIndex}\n`;
        // Position at bottom 15% of video using line:85%
        vtt += `${startTime} --> ${endTime} line:85% position:50% align:center\n`;
        vtt += `${splitTextForSubtitle(text, 18)}\n\n`;
        cueIndex++;
        continue;
      }
      
      // Split long segment by character count and duration
      const charsPerSecond = text.length / duration;
      const targetChunkDuration = Math.min(maxSegmentDuration, maxChars / charsPerSecond);
      const numChunks = Math.ceil(duration / targetChunkDuration);
      const chunkDuration = duration / numChunks;
      const charsPerChunk = Math.ceil(text.length / numChunks);
      
      for (let i = 0; i < numChunks; i++) {
        const chunkStart = segment.start + (i * chunkDuration);
        const chunkEnd = Math.min(chunkStart + chunkDuration, segment.end);
        const textStart = i * charsPerChunk;
        const textEnd = Math.min(textStart + charsPerChunk, text.length);
        const chunkText = text.slice(textStart, textEnd);
        
        if (chunkText.length > 0) {
          const startTime = formatVTTTime(chunkStart);
          const endTime = formatVTTTime(chunkEnd);
          vtt += `${cueIndex}\n`;
          // Position at bottom 15% of video using line:85%
          vtt += `${startTime} --> ${endTime} line:85% position:50% align:center\n`;
          vtt += `${splitTextForSubtitle(chunkText, 18)}\n\n`;
          cueIndex++;
        }
      }
    }
    
    return vtt;
  };

  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  const handleRegenerateSubtitles = async (transcription: Transcription) => {
    if (!transcription.technique_id) return;
    
    setRegeneratingIds(prev => new Set(prev).add(transcription.technique_id!));
    
    try {
      // Generate new VTT from existing segments
      const vttContent = generateVTT(transcription.segments || []);
      
      // Update subtitle in database
      const { error } = await supabase
        .from('video_subtitles')
        .upsert({
          transcription_id: transcription.id,
          language_code: 'ja',
          vtt_content: vttContent,
          status: 'completed',
        }, { onConflict: 'transcription_id,language_code' });
      
      if (error) throw error;
      
      toast.success('字幕を再生成しました');
    } catch (error: any) {
      console.error('Regenerate error:', error);
      toast.error(`再生成エラー: ${error.message}`);
    } finally {
      setRegeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transcription.technique_id!);
        return newSet;
      });
    }
  };

  const filteredTechniques = techniques.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.name_ja.toLowerCase().includes(query) ||
      (t.series_prefix || '').toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">文字起こし管理</h2>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="動画名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {Object.keys(transcriptions).length} / {techniques.length} 件の文字起こし完了
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTechniques.map((technique) => {
          const transcription = transcriptions[technique.id];
          const isTranscribing = transcribingIds.has(technique.id);
          const isRegenerating = regeneratingIds.has(technique.id);

          return (
            <Card key={technique.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {technique.series_prefix && (
                        <Badge variant="secondary" className="text-xs">
                          {technique.series_prefix}-{technique.series_order}
                        </Badge>
                      )}
                      <span className="font-medium truncate">
                        {technique.name_ja || technique.name}
                      </span>
                    </div>
                    {transcription && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {transcription.edited_text || transcription.original_text}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {transcription ? (
                      <>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <FileText className="h-3 w-3 mr-1" />
                          完了
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateSubtitles(transcription)}
                          disabled={isRegenerating}
                        >
                          {isRegenerating ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-1" />
                          )}
                          字幕再生成
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTranscription(transcription)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleTranscribe(technique)}
                        disabled={isTranscribing}
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            処理中...
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4 mr-1" />
                            文字起こし
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTranscription} onOpenChange={(open) => !open && setEditingTranscription(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>文字起こしを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              文字起こしを修正して、字幕として使用できます。改行で区切ると自動的にセグメントに分割されます。
            </div>
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={15}
              className="font-mono text-sm"
              placeholder="文字起こしテキスト..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTranscription(null)}>
                <X className="h-4 w-4 mr-1" />
                キャンセル
              </Button>
              <Button onClick={handleSaveTranscription} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
