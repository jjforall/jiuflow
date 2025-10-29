import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const t = translations[language];

  const techniqueData = id ? t.map.techniques[id as keyof typeof t.map.techniques] : null;
  const detailData = id ? t.video.details[id as keyof typeof t.video.details] : null;

  if (!techniqueData) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-32 text-center">
          <h1 className="text-4xl font-light mb-4">{t.video.notFound}</h1>
          <Link to="/map">
            <Button variant="outline">{t.video.backToMap}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedTechniques = [
    { id: "triangle-closed", name: "Triangle from Closed Guard" },
    { id: "omoplata-closed", name: "Omoplata from Closed Guard" },
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-20">
        {/* Video Player */}
        <div className="w-full bg-muted">
          <div className="max-w-6xl mx-auto aspect-video flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">▶</div>
              <div className="text-sm">4K Video Player</div>
              <div className="text-xs mt-2">Overhead + Side View</div>
            </div>
          </div>
        </div>

        {/* Technique Info */}
        <div className="max-w-4xl mx-auto px-6 mt-12">
          <div className="mb-8 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-light mb-2">{techniqueData.name}</h1>
            <h2 className="text-2xl text-muted-foreground font-light">
              {techniqueData.nameLocal}
            </h2>
          </div>

          {detailData && (
            <>
              <div className="mb-12 animate-fade-up">
                <p className="text-lg font-light text-muted-foreground leading-relaxed">
                  {detailData.desc}
                </p>
              </div>

              {/* Key Points */}
              <div className="mb-12 animate-fade-up">
                <h3 className="text-2xl font-light mb-6 border-b border-border pb-2">
                  {t.video.keyPoints}
                </h3>
                <ul className="space-y-4">
                  {detailData.points.map((point: string, index: number) => (
                    <li key={index} className="flex gap-4">
                      <span className="text-muted-foreground font-light">{index + 1}.</span>
                      <span className="font-light">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Related Techniques */}
              <div className="animate-fade-up">
                <h3 className="text-2xl font-light mb-6 border-b border-border pb-2">
                  {t.video.related}
                </h3>
                <div className="grid gap-4">
                  {relatedTechniques.map((related) => (
                    <Link
                      key={related.id}
                      to={`/video/${related.id}`}
                      className="border border-border p-6 transition-smooth hover:bg-muted"
                    >
                      <span className="font-light">{related.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="mt-12 text-center">
            <Link to="/map">
              <Button variant="outline" size="lg">
                {t.video.backToMap}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Video;
