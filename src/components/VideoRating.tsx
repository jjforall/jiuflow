import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface VideoRatingProps {
  videoId: string;
  userId: string;
}

export const VideoRating = ({ videoId, userId }: VideoRatingProps) => {
  const { language } = useLanguage();
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  useEffect(() => {
    loadRatings();
  }, [videoId, userId]);

  const loadRatings = async () => {
    try {
      // Get user's rating
      const { data: userRatingData } = await supabase
        .from("video_ratings")
        .select("rating")
        .eq("video_id", videoId)
        .eq("user_id", userId)
        .maybeSingle();

      if (userRatingData) {
        setUserRating(userRatingData.rating);
      }

      // Get average rating
      const { data: allRatings } = await supabase
        .from("video_ratings")
        .select("rating")
        .eq("video_id", videoId);

      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        setAverageRating(avg);
        setTotalRatings(allRatings.length);
      }
    } catch (error) {
      console.error("Error loading ratings:", error);
    }
  };

  const handleRating = async (rating: number) => {
    try {
      const { error } = await supabase
        .from("video_ratings")
        .upsert(
          {
            user_id: userId,
            video_id: videoId,
            rating,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,video_id',
          }
        );

      if (error) throw error;

      setUserRating(rating);
      loadRatings();
      toast.success(
        language === "ja" 
          ? "評価を保存しました" 
          : language === "pt" 
          ? "Avaliação salva" 
          : "Rating saved"
      );
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error(
        language === "ja" 
          ? "評価の保存に失敗しました" 
          : language === "pt" 
          ? "Erro ao salvar avaliação" 
          : "Failed to save rating"
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= (hoveredRating || userRating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        {totalRatings > 0 && (
          <div className="text-sm text-muted-foreground">
            {averageRating.toFixed(1)} ({totalRatings}{" "}
            {language === "ja" ? "件" : language === "pt" ? "avaliações" : "ratings"})
          </div>
        )}
      </div>
      {userRating > 0 && (
        <p className="text-xs text-muted-foreground">
          {language === "ja" 
            ? `あなたの評価: ${userRating}` 
            : language === "pt" 
            ? `Sua avaliação: ${userRating}` 
            : `Your rating: ${userRating}`}
        </p>
      )}
    </div>
  );
};