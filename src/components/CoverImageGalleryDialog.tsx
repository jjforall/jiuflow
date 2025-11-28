import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";
import hero6 from "@/assets/hero-6.jpg";
import hero7 from "@/assets/hero-7.jpg";
import hero8 from "@/assets/hero-8.jpg";
import hero9 from "@/assets/hero-9.jpg";
import hero10 from "@/assets/hero-10.jpg";

const COVER_IMAGES = [
  hero1, hero2, hero3, hero4, hero5,
  hero6, hero7, hero8, hero9, hero10
];

interface CoverImageGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (index: number) => void;
  currentIndex?: number;
}

export function CoverImageGalleryDialog({
  open,
  onOpenChange,
  onSelectImage,
  currentIndex
}: CoverImageGalleryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>カバー画像を選択</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {COVER_IMAGES.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectImage(index);
                onOpenChange(false);
              }}
              className="relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105 hover:border-primary"
              style={{
                borderColor: currentIndex === index ? "hsl(var(--primary))" : "hsl(var(--border))"
              }}
            >
              <img
                src={image}
                alt={`カバー画像 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {currentIndex === index && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="bg-primary text-primary-foreground rounded-full p-2">
                    <Check className="h-6 w-6" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
