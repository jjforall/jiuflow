import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";

interface Technique {
  id: string;
  name: string;
  nameJp: string;
  category: "pull" | "control" | "submission";
  description: string;
  videoId?: string;
}

const techniques: Technique[] = [
  {
    id: "closed-guard-pull",
    name: "Closed Guard Pull",
    nameJp: "クローズドガード引き込み",
    category: "pull",
    description: "試合開始から相手をコントロール下に置く基本的な引き込み。",
  },
  {
    id: "closed-guard",
    name: "Closed Guard Control",
    nameJp: "クローズドガードコントロール",
    category: "control",
    description: "相手の動きを制限し、攻撃のチャンスを作り出すポジション。",
  },
  {
    id: "armbar-closed",
    name: "Armbar from Closed Guard",
    nameJp: "クローズドガードからの腕十字",
    category: "submission",
    description: "クローズドガードから最も基本的な一本技。",
  },
  {
    id: "triangle-closed",
    name: "Triangle from Closed Guard",
    nameJp: "クローズドガードからの三角絞め",
    category: "submission",
    description: "足を使った強力な絞め技。",
  },
];

const Map = () => {
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);

  const categoryColors = {
    pull: "border-secondary",
    control: "border-accent",
    submission: "border-foreground",
  };

  const categoryLabels = {
    pull: "引き込み",
    control: "コントロール",
    submission: "一本",
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">Technique Map</h1>
            <p className="text-xl text-muted-foreground font-light">
              技の流れを体系的に理解する
            </p>
          </div>

          {/* Map Flow */}
          <div className="mb-20">
            <div className="flex items-center justify-center gap-8 mb-12">
              <div className="text-center">
                <div className="text-sm font-light text-muted-foreground mb-2">Pull</div>
                <div className="w-24 h-1 bg-secondary"></div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-sm font-light text-muted-foreground mb-2">Control</div>
                <div className="w-24 h-1 bg-accent"></div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-sm font-light text-muted-foreground mb-2">Submission</div>
                <div className="w-24 h-1 bg-foreground"></div>
              </div>
            </div>

            {/* Techniques Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {["pull", "control", "submission"].map((category) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-light border-b border-border pb-2">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                  {techniques
                    .filter((tech) => tech.category === category)
                    .map((tech) => (
                      <button
                        key={tech.id}
                        onClick={() => setSelectedTech(tech)}
                        className={`w-full text-left p-6 border ${
                          categoryColors[category as keyof typeof categoryColors]
                        } transition-smooth hover:bg-muted ${
                          selectedTech?.id === tech.id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="font-light mb-1">{tech.name}</div>
                        <div className="text-sm text-muted-foreground">{tech.nameJp}</div>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Technique Detail */}
          {selectedTech && (
            <div className="border border-border p-8 animate-fade-in">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">▶</div>
                    <div className="text-sm">Video Player</div>
                  </div>
                </div>
                
                <div>
                  <h2 className="text-3xl font-light mb-2">{selectedTech.name}</h2>
                  <h3 className="text-xl text-muted-foreground font-light mb-6">
                    {selectedTech.nameJp}
                  </h3>
                  <p className="text-muted-foreground font-light mb-6">
                    {selectedTech.description}
                  </p>
                  <Link
                    to={`/video/${selectedTech.id}`}
                    className="inline-block border border-foreground px-8 py-3 transition-smooth hover:bg-foreground hover:text-background"
                  >
                    詳しく見る
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Map;
