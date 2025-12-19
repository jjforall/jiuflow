import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Play, Pause, Edit2, Check, X, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface Transcription {
  id: string;
  technique_id: string | null;
  user_video_id: string | null;
  language_code: string;
  original_text: string;
  edited_text: string | null;
  segments: Segment[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  video_url: string | null;
  thumbnail_url: string | null;
}

const TranscriptionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [technique, setTechnique] = useState<Technique | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingProgress, setFormattingProgress] = useState(0);
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null);
  const [editedSegments, setEditedSegments] = useState<Segment[]>([]);
  const [tempEditText, setTempEditText] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch transcription
        const { data: transcriptionData, error: transcriptionError } = await supabase
          .from('video_transcriptions')
          .select('*')
          .eq('id', id)
          .single();

        if (transcriptionError) throw transcriptionError;
        
        // Parse segments safely
        const rawSegments = transcriptionData.segments;
        const segments: Segment[] = Array.isArray(rawSegments) 
          ? rawSegments.map((s: unknown) => {
              const seg = s as { start?: number; end?: number; text?: string };
              return {
                start: seg.start ?? 0,
                end: seg.end ?? 0,
                text: seg.text ?? ''
              };
            })
          : [];
        
        setTranscription({
          ...transcriptionData,
          segments
        });
        setEditedSegments(segments);

        // Fetch technique if technique_id exists
        if (transcriptionData.technique_id) {
          const { data: techniqueData, error: techniqueError } = await supabase
            .from('techniques')
            .select('id, name, name_ja, video_url, thumbnail_url')
            .eq('id', transcriptionData.technique_id)
            .single();

          if (!techniqueError && techniqueData) {
            setTechnique(techniqueData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: Segment) => {
    if (videoRef.current) {
      videoRef.current.currentTime = segment.start;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const startEditSegment = (index: number) => {
    setEditingSegmentIndex(index);
    setTempEditText(editedSegments[index].text);
  };

  const saveSegmentEdit = () => {
    if (editingSegmentIndex === null) return;
    
    const newSegments = [...editedSegments];
    newSegments[editingSegmentIndex] = {
      ...newSegments[editingSegmentIndex],
      text: tempEditText
    };
    setEditedSegments(newSegments);
    setEditingSegmentIndex(null);
    setTempEditText('');
  };

  const cancelSegmentEdit = () => {
    setEditingSegmentIndex(null);
    setTempEditText('');
  };

  const handleFormatAll = async () => {
    if (editedSegments.length === 0) return;

    setIsFormatting(true);
    setFormattingProgress(0);

    try {
      // Process in batches of 5 segments
      const batchSize = 5;
      const formattedSegments: Segment[] = [];
      
      for (let i = 0; i < editedSegments.length; i += batchSize) {
        const batch = editedSegments.slice(i, i + batchSize);
        
        const { data, error } = await supabase.functions.invoke('format-transcription', {
          body: { 
            segments: batch,
            language: transcription?.language_code || 'ja'
          }
        });

        if (error) throw error;
        
        formattedSegments.push(...(data.segments || batch));
        setFormattingProgress(Math.round(((i + batch.length) / editedSegments.length) * 100));
      }

      setEditedSegments(formattedSegments);
      toast.success('文字起こしをAIで整形しました');
    } catch (error) {
      console.error('Format error:', error);
      toast.error('整形に失敗しました');
    } finally {
      setIsFormatting(false);
      setFormattingProgress(0);
    }
  };

  const handleFormatSingle = async (index: number) => {
    const segment = editedSegments[index];
    
    try {
      const { data, error } = await supabase.functions.invoke('format-transcription', {
        body: { 
          segments: [segment],
          language: transcription?.language_code || 'ja'
        }
      });

      if (error) throw error;
      
      if (data.segments?.[0]) {
        const newSegments = [...editedSegments];
        newSegments[index] = data.segments[0];
        setEditedSegments(newSegments);
        toast.success('セグメントを整形しました');
      }
    } catch (error) {
      console.error('Format error:', error);
      toast.error('整形に失敗しました');
    }
  };

  const handleSaveAll = async () => {
    if (!transcription) return;

    setIsSaving(true);
    try {
      const fullText = editedSegments.map(s => s.text).join(' ');
      
      // Convert segments to JSON-compatible format
      const segmentsJson = editedSegments.map(s => ({
        start: s.start,
        end: s.end,
        text: s.text
      }));
      
      const { error } = await supabase
        .from('video_transcriptions')
        .update({
          segments: segmentsJson,
          edited_text: fullText,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcription.id);

      if (error) throw error;

      // Update VTT subtitle as well
      const vttContent = generateVTT(editedSegments);
      await supabase
        .from('video_subtitles')
        .update({
          vtt_content: vttContent,
          updated_at: new Date().toISOString()
        })
        .eq('transcription_id', transcription.id);

      toast.success('文字起こしを保存しました');
      
      // Update local state
      setTranscription({
        ...transcription,
        segments: editedSegments,
        edited_text: fullText
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const generateVTT = (segments: Segment[]): string => {
    let vtt = "WEBVTT\n\n";

    segments.forEach((segment, index) => {
      const startTime = formatVTTTime(segment.start);
      const endTime = formatVTTTime(segment.end);
      vtt += `${index + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${segment.text.trim()}\n\n`;
    });

    return vtt;
  };

  const formatVTTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  const isSegmentActive = (segment: Segment): boolean => {
    return currentTime >= segment.start && currentTime < segment.end;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">文字起こしが見つかりませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-card border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="default" 
              onClick={() => navigate('/admin?tab=techniques')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              テクニック管理に戻る
            </Button>
            <div>
              <h1 className="text-xl font-bold">文字起こし編集</h1>
              {technique && (
                <p className="text-sm text-muted-foreground">{technique.name_ja || technique.name}</p>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleFormatAll} 
                disabled={isFormatting || isSaving || editedSegments.length === 0}
              >
                {isFormatting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    整形中... {formattingProgress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AIで整形
                  </>
                )}
              </Button>
              <Button onClick={handleSaveAll} disabled={isSaving || isFormatting}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Section */}
          <div className="space-y-4">
            <div className="sticky top-20">
              {technique?.video_url ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={technique.video_url}
                    className="w-full h-full"
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">動画がありません</p>
                </div>
              )}
              
              {/* Full transcript text */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-medium mb-2">全文</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {transcription.edited_text || transcription.original_text}
                </p>
              </div>
            </div>
          </div>

          {/* Segments Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium mb-4">セグメント別テキスト</h3>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {editedSegments.map((segment, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSegmentActive(segment)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card hover:bg-accent/50'
                  }`}
                  onClick={() => handleSegmentClick(segment)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded">
                        {formatTime(segment.start)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSegmentClick(segment);
                        }}
                      >
                        {isPlaying && isSegmentActive(segment) ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    
                    {isAdmin && editingSegmentIndex !== index && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="AIで整形"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFormatSingle(index);
                          }}
                        >
                          <Wand2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="編集"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditSegment(index);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingSegmentIndex === index ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={tempEditText}
                        onChange={(e) => setTempEditText(e.target.value)}
                        className="min-h-[80px] text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelSegmentEdit();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveSegmentEdit();
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed">{segment.text}</p>
                  )}
                </div>
              ))}

              {editedSegments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  セグメントデータがありません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionDetail;
