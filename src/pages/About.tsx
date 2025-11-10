import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

const About = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate content loading
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-light mb-6">About</h1>
        <p className="text-2xl md:text-3xl font-light mb-8 max-w-3xl mx-auto">
          柔術を、映像で体系化する──
        </p>
        <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
          それが、私たちのミッションです。
        </p>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            私たちは、<strong>「技術としての柔術」</strong>を映像というフォーマットで整理し、<br />
            誰もが理解しやすく、続けやすく、そして長く強くなれる形で届けています。
          </p>
          <p className="space-y-2">
            上面からの4K撮影。<br />
            明確に見える技の流れ。<br />
            ひとつひとつの動きに込められた意味。
          </p>
          <p>
            それらを通して、柔術の本質――「流れ・呼吸・構造・意図」――を伝えます。
          </p>
        </div>
      </section>

      {/* Instructor Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-light mb-8">Instructor</h2>
          <div className="space-y-6 text-lg leading-relaxed">
            <p className="text-2xl font-light">
              村田 良蔵（Ryozo Murata）<br />
              <span className="text-base text-muted-foreground">1980年4月24日生まれ。北海道出身。</span>
            </p>
            <p>
              ブラジリアン柔術において、北海道初のグレイシー直系黒帯。<br />
              2018年・2019年、SJJIF世界選手権マスター2黒帯フェザー級 優勝。<br />
              日本人初の世界チャンピオン。
            </p>
            <p>
              道場代表・実業家・指導者として活動し、<br />
              「怪我なく、毎日続けられる柔術」<br />
              「ライフスタイルとしての柔術」をテーマに、<br />
              ヨガ・身体構造・ウェルネスの視点も融合しています。
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-4xl font-light mb-8">Philosophy</h2>
        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            柔術は常にアップデートされる「生きた学問」です。<br />
            私たちは現時点で最良と思える方法を提供していますが、<br />
            日々、より良い形を探し続けています。
          </p>
          <p>
            もし新しい視点やテクニック、トレーニング法を知っていたら、<br />
            ぜひ教えてください。<br />
            柔術を通じて、世界中がつながり、共に成長できるように。
          </p>
        </div>
      </section>

      {/* Connect Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-light mb-8">Connect</h2>
          <div className="space-y-4 text-lg">
            <p className="mb-6">💬 ご意見・提案・最新情報などは以下からどうぞ：</p>
            <p>
              <a href="https://www.instagram.com/ryozomurata/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Instagram → @ryozomurata
              </a>
            </p>
            <p>
              <a href="https://www.facebook.com/profile.php?id=100006313396750" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Facebook
              </a>
            </p>
            <p>
              <a href="https://www.ryozo-murata.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Website → www.ryozo-murata.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Invitation Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl font-light mb-8">Invitation</h2>
          <p className="text-xl leading-relaxed">
            静かに、深く学ぶ柔術。<br />
            安全で、長くできて、強くなる。<br />
            その一歩を、ここから始めてみませんか？
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button onClick={() => navigate("/join")} size="lg" className="min-w-[200px]">
              {t("join.cta.button")}
            </Button>
            <Button onClick={() => navigate("/login")} variant="outline" size="lg" className="min-w-[200px]">
              {t("nav.login")}
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? (
            <div className="animate-fade-in space-y-20">
              <div className="text-center space-y-6">
                <Skeleton className="h-16 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-10 w-1/3 mx-auto" />
                <div className="border border-border p-8 space-y-4">
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-20 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">{t("about.title")}</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto whitespace-pre-line">
              {t("about.subtitle")}
            </p>
              </div>

              {/* Mission */}
              <div className="mb-20 animate-fade-up">
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg font-light text-muted-foreground leading-relaxed whitespace-pre-line">
                    {t("about.mission")}
                  </p>
                </div>
              </div>

              {/* Instructor */}
              <div className="animate-fade-up">
                <h2 className="text-3xl font-light mb-8 text-center border-b border-border pb-4">
                  {t("about.instructorTitle")}
                </h2>
                <div className="border border-border p-8">
                  <h3 className="text-3xl font-light mb-6 text-center">{t("about.instructor.name")}</h3>
                  <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                    <p>{t("about.instructor.birth")}</p>
                    <p>{t("about.instructor.achievement1")}</p>
                    <p>{t("about.instructor.achievement2")}</p>
                    <p>{t("about.instructor.philosophy")}</p>
                    <p>{t("about.instructor.approach")}</p>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="mt-20 text-center animate-fade-up">
                <div className="border border-border p-12 bg-muted/30">
                  <h2 className="text-3xl font-light mb-6">始めてみませんか？</h2>
                  <p className="text-muted-foreground mb-8 font-light">
                    柔術を、体系的に。静かに、深く学ぶ。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/join")}
                      className="font-light"
                    >
                      プランを見る
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => navigate("/login")}
                      className="font-light"
                    >
                      今すぐ始める
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
