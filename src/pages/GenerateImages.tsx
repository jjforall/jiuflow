import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function GenerateImages() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<Array<{ type: string; url: string; base64: string }>>([]);

  const imageTypes = [
    { id: "hero1", name: "トレーニングシーン" },
    { id: "hero2", name: "インストラクター指導" },
    { id: "hero3", name: "帯を結ぶ手元" },
    { id: "hero4", name: "試合シーン" },
    { id: "hero5", name: "グループトレーニング" },
    { id: "hero6", name: "道着と帯" },
    { id: "hero7", name: "学習シーン" },
    { id: "hero8", name: "俯瞰ビュー" },
    { id: "cover1", name: "カバー画像1" },
    { id: "cover2", name: "カバー画像2" },
  ];

  const generateAllImages = async () => {
    setGenerating(true);
    setProgress(0);
    setGeneratedImages([]);

    try {
      for (let i = 0; i < imageTypes.length; i++) {
        const imageType = imageTypes[i];
        toast.info(`画像生成中: ${imageType.name} (${i + 1}/${imageTypes.length})`);

        const { data, error } = await supabase.functions.invoke("generate-bjj-images", {
          body: { imageType: imageType.id, index: i + 1 },
        });

        if (error) throw error;

        if (data?.imageUrl) {
          setGeneratedImages((prev) => [
            ...prev,
            { type: imageType.name, url: data.imageUrl, base64: data.base64 },
          ]);
        }

        setProgress(((i + 1) / imageTypes.length) * 100);
      }

      toast.success("全ての画像を生成しました！");
    } catch (error) {
      console.error("Error generating images:", error);
      toast.error("画像生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = (base64: string, filename: string) => {
    const link = document.createElement("a");
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center animate-fade-up">
            <h1 className="text-4xl font-bold mb-4">
              <Sparkles className="inline w-10 h-10 mr-2 text-primary" />
              BJJ画像ジェネレーター
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              AIを使用してサイトに合ったブラジリアン柔術の画像を生成します
            </p>
            <Button
              size="lg"
              onClick={generateAllImages}
              disabled={generating}
              className="px-8"
            >
              {generating ? "生成中..." : "10枚の画像を生成"}
            </Button>
          </div>

          {generating && (
            <Card className="mb-8 animate-fade-up">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>進行状況</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {generatedImages.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">生成された画像</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((image, index) => (
                  <Card key={index} className="overflow-hidden animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{image.type}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
                        <img
                          src={image.url}
                          alt={image.type}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(image.url, "_blank")}
                        >
                          プレビュー
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadImage(image.base64, `${image.type}.jpg`)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
