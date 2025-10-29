import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";

interface TechniqueDetail {
  id: string;
  name: string;
  nameJp: string;
  description: string;
  keyPoints: string[];
  relatedTechniques: { id: string; name: string }[];
}

const techniqueDetails: Record<string, TechniqueDetail> = {
  "armbar-closed": {
    id: "armbar-closed",
    name: "Armbar from Closed Guard",
    nameJp: "クローズドガードからの腕十字",
    description:
      "クローズドガードから最も基本的な一本技。相手の腕を制御し、脚でコントロールしながら関節を極める。",
    keyPoints: [
      "相手の姿勢を崩し、片腕をコントロール",
      "腰を切りながら角度を作る",
      "膝を閉じて相手の頭をコントロール",
      "ヒップを上げて関節を極める",
    ],
    relatedTechniques: [
      { id: "triangle-closed", name: "Triangle from Closed Guard" },
      { id: "omoplata-closed", name: "Omoplata from Closed Guard" },
    ],
  },
};

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const technique = id ? techniqueDetails[id] : null;

  if (!technique) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-32 text-center">
          <h1 className="text-4xl font-light mb-4">Technique not found</h1>
          <Link to="/map">
            <Button variant="outline">Back to Map</Button>
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-4xl md:text-5xl font-light mb-2">{technique.name}</h1>
            <h2 className="text-2xl text-muted-foreground font-light">
              {technique.nameJp}
            </h2>
          </div>

          <div className="mb-12 animate-fade-up">
            <p className="text-lg font-light text-muted-foreground leading-relaxed">
              {technique.description}
            </p>
          </div>

          {/* Key Points */}
          <div className="mb-12 animate-fade-up">
            <h3 className="text-2xl font-light mb-6 border-b border-border pb-2">
              Key Points
            </h3>
            <ul className="space-y-4">
              {technique.keyPoints.map((point, index) => (
                <li key={index} className="flex gap-4">
                  <span className="text-muted-foreground font-light">{index + 1}.</span>
                  <span className="font-light">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Related Techniques */}
          {technique.relatedTechniques.length > 0 && (
            <div className="animate-fade-up">
              <h3 className="text-2xl font-light mb-6 border-b border-border pb-2">
                関連技
              </h3>
              <div className="grid gap-4">
                {technique.relatedTechniques.map((related) => (
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
          )}

          <div className="mt-12 text-center">
            <Link to="/map">
              <Button variant="outline" size="lg">
                マップに戻る
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Video;
