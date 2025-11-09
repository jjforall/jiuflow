import { useState, useEffect } from "react";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";
import hero6 from "@/assets/hero-6.jpg";
import hero7 from "@/assets/hero-7.jpg";
import hero8 from "@/assets/hero-8.jpg";

interface HeroImage {
  id: number;
  url: string;
}

const heroImages: HeroImage[] = [
  { id: 0, url: hero1 },
  { id: 1, url: hero2 },
  { id: 2, url: hero3 },
  { id: 3, url: hero4 },
  { id: 4, url: hero5 },
  { id: 5, url: hero6 },
  { id: 6, url: hero7 },
  { id: 7, url: hero8 },
];

export const useHeroImages = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    currentImage: heroImages[currentIndex],
    images: heroImages,
    currentIndex,
    isLoading: false,
    totalImages: heroImages.length
  };
};
