import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: "pull" | "control" | "submission";
  video_url: string | null;
  display_order: number;
}

const Map = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTechniques();
  }, []);

  const loadTechniques = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error loading techniques",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setTechniques((data as Technique[]) || []);
    setIsLoading(false);
  };

  const getTechniqueName = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.name_ja;
      case "pt":
        return tech.name_pt;
      default:
        return tech.name;
    }
  };

  const getTechniqueDescription = (tech: Technique) => {
    switch (language) {
      case "ja":
        return tech.description_ja;
      case "pt":
        return tech.description_pt;
      default:
        return tech.description;
    }
  };

  const categoryColors = {
    pull: "border-secondary",
    control: "border-accent",
    submission: "border-foreground",
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">{t.map.title}</h1>
            <p className="text-xl text-muted-foreground font-light">
              {t.map.subtitle}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{language === "ja" ? "読み込み中..." : language === "pt" ? "Carregando..." : "Loading..."}</p>
            </div>
          ) : techniques.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{language === "ja" ? "テクニックがまだ追加されていません" : language === "pt" ? "Nenhuma técnica adicionada ainda" : "No techniques added yet"}</p>
            </div>
          ) : (
            <>

          {/* Map Flow */}
          <div className="mb-20">
            <div className="flex items-center justify-center gap-8 mb-12">
              <div className="text-center">
                <div className="text-sm font-light text-muted-foreground mb-2">{t.map.pull}</div>
                <div className="w-24 h-1 bg-secondary"></div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-sm font-light text-muted-foreground mb-2">{t.map.control}</div>
                <div className="w-24 h-1 bg-accent"></div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-sm font-light text-muted-foreground mb-2">{t.map.submission}</div>
                <div className="w-24 h-1 bg-foreground"></div>
              </div>
            </div>

            {/* Techniques Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {["pull", "control", "submission"].map((category) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-light border-b border-border pb-2">
                    {t.map[category as keyof typeof t.map] as string}
                  </h3>
                  {techniques
                    .filter((tech) => tech.category === category)
                    .map((tech) => (
                      <Link
                        key={tech.id}
                        to={`/video/${tech.id}`}
                        className={`block w-full text-left p-6 border ${
                          categoryColors[category as keyof typeof categoryColors]
                        } transition-smooth hover:bg-muted`}
                      >
                        <div className="font-light mb-1">{getTechniqueName(tech)}</div>
                        {tech.video_url && (
                          <div className="text-xs text-muted-foreground mt-2">▶ Video available</div>
                        )}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </div>

          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Map;
