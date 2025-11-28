import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";

interface CoverUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCoverUrl?: string | null;
  userId: string;
  onUploadComplete: (url: string) => void;
}

export function CoverUploadDialog({
  open,
  onOpenChange,
  currentCoverUrl,
  userId,
  onUploadComplete,
}: CoverUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("画像ファイルを選択してください");
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        toast.error("ファイルサイズは50MB以下にしてください");
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
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

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl || !croppedAreaPixels) {
      toast.error("画像を選択してください");
      return;
    }

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], selectedFile.name, {
        type: 'image/jpeg',
      });

      const fileExt = 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_image_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast.success("カバー画像をアップロードしました");
      onUploadComplete(publicUrl);
      onOpenChange(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>カバー画像を変更</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!previewUrl ? (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                画像をドラッグ＆ドロップするか、クリックして選択してください
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="cover-upload"
              />
              <label htmlFor="cover-upload">
                <Button type="button" variant="outline" onClick={() => document.getElementById('cover-upload')?.click()}>
                  ファイルを選択
                </Button>
              </label>
            </div>
          ) : (
            <>
              <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={previewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">ズーム</label>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? "アップロード中..." : "アップロード"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
