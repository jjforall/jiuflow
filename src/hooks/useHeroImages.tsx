import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeroImage {
  id: number;
  url: string;
}

const heroImagePrompts = [
  "Overhead view of two Brazilian Jiu-Jitsu practitioners in white gis training on a clean white mat, 4K professional photography, minimalist composition, natural lighting, enjoyable atmosphere, modern dojo aesthetic",
  "Top-down shot of Brazilian Jiu-Jitsu technique demonstration, athletic movement, clean white background, professional sports photography, stylish composition, positive energy",
  "Aerial perspective of Jiu-Jitsu training session, dynamic movement, contemporary martial arts photography, minimalist design, professional lighting, engaging atmosphere"
];

export const useHeroImages = () => {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateImages();
  }, []);

  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [images.length]);

  const generateImages = async () => {
    try {
      const generatedImages: HeroImage[] = [];

      for (let i = 0; i < heroImagePrompts.length; i++) {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt: heroImagePrompts[i] }
        });

        if (error) {
          console.error(`Error generating image ${i}:`, error);
          continue;
        }

        if (data?.imageUrl) {
          generatedImages.push({
            id: i,
            url: data.imageUrl
          });
        }
      }

      setImages(generatedImages);
    } catch (error) {
      console.error('Error generating hero images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentImage: images[currentIndex],
    images,
    currentIndex,
    isLoading,
    totalImages: images.length
  };
};
