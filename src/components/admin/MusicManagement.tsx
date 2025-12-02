import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Music, Play, Pause, GripVertical, Upload, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const MusicManagement = () => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    audio_url: "",
    thumbnail_url: "",
    is_active: true,
    audioFile: null as File | null,
    thumbnailFile: null as File | null,
  });

  useEffect(() => {
    fetchTracks();
    return () => {
      audioElement?.pause();
    };
  }, []);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
      toast.error("音楽トラックの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("music-tracks")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("music-tracks")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let audioUrl = formData.audio_url;
      let thumbnailUrl = formData.thumbnail_url;

      // Upload audio file if selected
      if (formData.audioFile) {
        audioUrl = await uploadFile(formData.audioFile, "audio");
      }

      // Upload thumbnail if selected
      if (formData.thumbnailFile) {
        thumbnailUrl = await uploadFile(formData.thumbnailFile, "thumbnails");
      }

      if (!audioUrl) {
        toast.error("音声ファイルまたはURLを指定してください");
        setUploading(false);
        return;
      }

      if (editingTrack) {
        const { error } = await supabase
          .from("music_tracks")
          .update({
            title: formData.title,
            artist: formData.artist || null,
            audio_url: audioUrl,
            thumbnail_url: thumbnailUrl || null,
            is_active: formData.is_active,
          })
          .eq("id", editingTrack.id);

        if (error) throw error;
        toast.success("トラックを更新しました");
      } else {
        const maxOrder = tracks.length > 0 ? Math.max(...tracks.map((t) => t.sort_order)) : 0;
        const { error } = await supabase.from("music_tracks").insert({
          title: formData.title,
          artist: formData.artist || null,
          audio_url: audioUrl,
          thumbnail_url: thumbnailUrl || null,
          is_active: formData.is_active,
          sort_order: maxOrder + 1,
        });

        if (error) throw error;
        toast.success("トラックを追加しました");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTracks();
    } catch (error) {
      console.error("Error saving track:", error);
      toast.error("保存に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このトラックを削除しますか？")) return;

    try {
      const { error } = await supabase.from("music_tracks").delete().eq("id", id);
      if (error) throw error;
      toast.success("トラックを削除しました");
      fetchTracks();
    } catch (error) {
      console.error("Error deleting track:", error);
      toast.error("削除に失敗しました");
    }
  };

  const handleToggleActive = async (track: MusicTrack) => {
    try {
      const { error } = await supabase
        .from("music_tracks")
        .update({ is_active: !track.is_active })
        .eq("id", track.id);

      if (error) throw error;
      toast.success(track.is_active ? "非公開にしました" : "公開しました");
      fetchTracks();
    } catch (error) {
      console.error("Error toggling active:", error);
      toast.error("更新に失敗しました");
    }
  };

  const handlePlayPreview = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      audioElement?.pause();
      setPlayingTrackId(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(track.audio_url);
      audio.play();
      audio.onended = () => setPlayingTrackId(null);
      setAudioElement(audio);
      setPlayingTrackId(track.id);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      artist: "",
      audio_url: "",
      thumbnail_url: "",
      is_active: true,
      audioFile: null,
      thumbnailFile: null,
    });
    setEditingTrack(null);
    setUploadMode("file");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const openEditDialog = (track: MusicTrack) => {
    setEditingTrack(track);
    setFormData({
      title: track.title,
      artist: track.artist || "",
      audio_url: track.audio_url,
      thumbnail_url: track.thumbnail_url || "",
      is_active: track.is_active,
      audioFile: null,
      thumbnailFile: null,
    });
    setUploadMode("url");
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">音楽管理</h2>
          <p className="text-muted-foreground">サイト内で再生する音楽を管理します</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              新規追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTrack ? "トラックを編集" : "新規トラック追加"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="artist">アーティスト</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) =>
                    setFormData({ ...formData, artist: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>音声ファイル *</Label>
                <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "url" | "file")} className="mt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file" className="flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      ファイル
                    </TabsTrigger>
                    <TabsTrigger value="url" className="flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      URL
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="file" className="mt-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFormData({ ...formData, audioFile: file, audio_url: "" });
                      }}
                    />
                    {formData.audioFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        選択中: {formData.audioFile.name}
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="url" className="mt-2">
                    <Input
                      type="url"
                      value={formData.audio_url}
                      onChange={(e) =>
                        setFormData({ ...formData, audio_url: e.target.value, audioFile: null })
                      }
                      placeholder="https://..."
                    />
                  </TabsContent>
                </Tabs>
                {editingTrack && formData.audio_url && !formData.audioFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    現在のURL: {formData.audio_url.substring(0, 50)}...
                  </p>
                )}
              </div>

              <div>
                <Label>サムネイル画像</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFormData({ ...formData, thumbnailFile: file });
                    }}
                  />
                  {formData.thumbnailFile && (
                    <p className="text-sm text-muted-foreground">
                      選択中: {formData.thumbnailFile.name}
                    </p>
                  )}
                  {!formData.thumbnailFile && (
                    <Input
                      type="url"
                      value={formData.thumbnail_url}
                      onChange={(e) =>
                        setFormData({ ...formData, thumbnail_url: e.target.value })
                      }
                      placeholder="またはURLを入力: https://..."
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">公開する</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={uploading}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "アップロード中..." : "保存"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Music className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>音楽トラックがありません</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>アーティスト</TableHead>
                <TableHead className="w-20">公開</TableHead>
                <TableHead className="w-20">試聴</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {track.thumbnail_url ? (
                        <img
                          src={track.thumbnail_url}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{track.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{track.artist || "-"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={track.is_active}
                      onCheckedChange={() => handleToggleActive(track)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlayPreview(track)}
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(track)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(track.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MusicManagement;
