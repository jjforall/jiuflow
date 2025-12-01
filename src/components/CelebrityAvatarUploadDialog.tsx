import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Crop } from "lucide-react";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CelebrityAvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  celebrityId: string;
  isAdmin: boolean;
  onUploadComplete: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area, mimeType: string = 'image/jpeg'): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, mimeType, 0.9);
  });
}

export const CelebrityAvatarUploadDialog = ({ 
  open, 
  onOpenChange, 
  celebrityId,
  isAdmin,
  onUploadComplete 
}: CelebrityAvatarUploadDialogProps) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('image/jpeg');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('ファイルサイズは50MB以下にしてください');
        return;
      }
      setFileMimeType(file.type);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !croppedAreaPixels || !user) return;

    setUploading(true);
    try {
      // Crop the image
      const croppedBlob = await getCroppedImg(selectedFile, croppedAreaPixels, fileMimeType);
      
      // Generate unique filename with correct extension
      const fileExt = fileMimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `celebrities/${celebrityId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          upsert: true,
          contentType: fileMimeType
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (isAdmin) {
        // Admin: directly update the celebrity
        const { error: updateError } = await supabase
          .from('celebrities')
          .update({ avatar_url: publicUrl })
          .eq('id', celebrityId);

        if (updateError) throw updateError;
        toast.success('プロフィール写真を更新しました');
      } else {
        // User: create edit request
        const { error: requestError } = await supabase
          .from('celebrity_edit_requests')
          .insert({
            celebrity_id: celebrityId,
            requested_by: user.id,
            avatar_url: publicUrl,
            status: 'pending',
          });

        if (requestError) throw requestError;
        toast.success('画像変更リクエストを送信しました。管理者の承認をお待ちください。');
      }

      onUploadComplete();
      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>プロフィール写真を変更</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <Upload className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                JPEGまたはPNG画像をアップロード（最大50MB）
              </p>
              <Button asChild>
                <label className="cursor-pointer">
                  ファイルを選択
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>
          ) : (
            <>
              <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={selectedFile}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">ズーム</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1"
                >
                  <Crop className="w-4 h-4 mr-2" />
                  {uploading ? 'アップロード中...' : (isAdmin ? 'アップロード' : '承認リクエスト送信')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
