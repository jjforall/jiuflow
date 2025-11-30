import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { ContactForm } from "@/components/ContactForm";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Lock, PlayCircle, UserX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TechniqueStats {
  category: string;
  count: number;
  techniques: Array<{ id: string; name: string; name_ja: string; name_pt: string }>;
}

const About = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [techniqueStats, setTechniqueStats] = useState<TechniqueStats[]>([]);

  useEffect(() => {
    const loadTechniqueStats = async () => {
      const { data } = await supabase
        .from("techniques")
        .select("id, name, name_ja, name_pt, category");

      if (data) {
        const allStats: TechniqueStats[] = [
          {
            category: "pull",
            count: data.filter(t => t.category === "pull").length,
            techniques: data.filter(t => t.category === "pull").slice(0, 5)
          },
          {
            category: "combat-base",
            count: data.filter(t => t.category === "combat-base").length,
            techniques: data.filter(t => t.category === "combat-base").slice(0, 5)
          },
          {
            category: "control",
            count: data.filter(t => t.category === "control").length,
            techniques: data.filter(t => t.category === "control").slice(0, 5)
          },
          {
            category: "submission",
            count: data.filter(t => t.category === "submission").length,
            techniques: data.filter(t => t.category === "submission").slice(0, 5)
          }
        ];
        // Filter out categories with 0 count
        const stats = allStats.filter(stat => stat.count > 0);
        setTechniqueStats(stats);
      }
      setIsLoading(false);
    };

    loadTechniqueStats();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Flow Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        
        {/* Flowing waves */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.05" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Flowing curves representing jiu-jitsu flow */}
          <path d="M0,150 Q400,50 800,150 T1600,150 L1600,300 L0,300 Z" 
                fill="url(#waveGradient1)" 
                className="animate-[wave_20s_ease-in-out_infinite]"
                style={{ transformOrigin: 'center' }} />
          <path d="M0,250 Q400,350 800,250 T1600,250 L1600,400 L0,400 Z" 
                fill="url(#waveGradient2)" 
                className="animate-[wave_25s_ease-in-out_infinite_reverse]"
                style={{ transformOrigin: 'center' }} />
          <path d="M0,350 Q400,450 800,350 T1600,350 L1600,500 L0,500 Z" 
                fill="url(#waveGradient1)" 
                className="animate-[wave_30s_ease-in-out_infinite]"
                style={{ transformOrigin: 'center' }} />
        </svg>
        
        {/* Flowing particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full mix-blend-screen"
              style={{
                width: `${100 + i * 50}px`,
                height: `${100 + i * 50}px`,
                left: `${i * 15}%`,
                top: `${20 + i * 10}%`,
                background: `radial-gradient(circle, hsl(var(--primary) / 0.03) 0%, transparent 70%)`,
                animation: `float ${15 + i * 5}s ease-in-out infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <section className="py-20 text-center">
            <h1 className="text-5xl md:text-6xl font-light mb-6">About</h1>
            <p className="text-2xl md:text-3xl font-light mb-8 max-w-3xl mx-auto">
              柔術を、映像で体系化する──
            </p>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              それが、私たちのミッションです。
            </p>
          </section>

          {/* Flow Chart Section */}
          <section className="py-16 max-w-5xl mx-auto">
            <h2 className="text-4xl font-light mb-12 text-center">技の流れ</h2>
            
            {isLoading ? (
              <div className="space-y-8">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <div className="space-y-12">
                {/* Flow visualization */}
                <ScrollArea className="w-full">
                  <div className="flex items-center gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                    {techniqueStats.map((stat, index) => (
                    <div key={stat.category} className="flex items-center gap-4 flex-shrink-0">
                      {/* Category Card */}
                       <div className="bg-card border border-border rounded-xl p-6 w-64 shadow-lg hover:shadow-xl transition-all flex-shrink-0">
                        <div className="text-center mb-4">
                          <h3 className="text-2xl font-light mb-2">
                            {stat.category === "pull" 
                              ? (language === "ja" ? "引き込み" : "Pull") 
                              : stat.category === "combat-base"
                              ? (language === "ja" ? "コンバットベース" : "Combat Base")
                              : stat.category === "control"
                              ? (language === "ja" ? "コントロール" : "Control")
                              : (language === "ja" ? "極め技" : "Submission")}
                          </h3>
                          <Badge variant="secondary" className="text-lg">
                            {stat.count} {language === "ja" ? "本の動画" : "videos"}
                          </Badge>
                        </div>
                        
                        {/* Technique samples */}
                        <div className="space-y-2 mt-4">
                          {stat.count === 0 ? (
                            <div className="text-center py-4">
                              <UserX className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {language === "ja" ? "準備中" : "Coming soon"}
                              </p>
                            </div>
                          ) : (
                            <>
                              {stat.techniques.slice(0, 3).map((tech) => (
                                <Link
                                  key={tech.id}
                                  to={`/video/${tech.id}`}
                                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
                                >
                                  <PlayCircle className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-primary" />
                                  <span className="truncate">
                                    {language === "ja" ? tech.name_ja : language === "pt" ? tech.name_pt : tech.name}
                                  </span>
                                </Link>
                              ))}
                              {stat.count > 3 && (
                                <Link
                                  to="/map"
                                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-3"
                                >
                                  <span>{language === "ja" ? `他 ${stat.count - 3}本` : `+${stat.count - 3} more`}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      {index < techniqueStats.length - 1 && (
                        <ArrowRight className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* CTA for more */}
                <div className="text-center mt-12 p-8 bg-gradient-to-br from-primary/5 to-transparent border border-border rounded-xl">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-light mb-4">
                    {language === "ja" 
                      ? "全ての技を見る" 
                      : language === "pt" 
                      ? "Ver todas as técnicas" 
                      : "See all techniques"}
                  </h3>
                  <p className="text-muted-foreground mb-3 max-w-2xl mx-auto">
                    {language === "ja" 
                      ? "引き込みからサブミッションまで、体系化された技術を全て視聴できます。" 
                      : language === "pt" 
                      ? "De puxadas a finalizações, acesse todas as técnicas sistematizadas." 
                      : "From pulls to submissions, access all systematized techniques."}
                  </p>
                  <p className="text-sm text-primary font-medium mb-6">
                    {language === "ja" 
                      ? "✨ 毎週金曜日に新しい動画を1本アップデート" 
                      : language === "pt" 
                      ? "✨ Novo vídeo toda sexta-feira" 
                      : "✨ New video every Friday"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => navigate("/join")} size="lg">
                      {language === "ja" ? "プランを見る" : language === "pt" ? "Ver Planos" : "View Plans"}
                    </Button>
                    <Button onClick={() => navigate("/map")} variant="outline" size="lg">
                      {language === "ja" ? "技マップを見る" : language === "pt" ? "Ver Mapa" : "View Map"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>


          {/* Mission Section */}
          <section className="py-16 max-w-4xl mx-auto">
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
          <section className="py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-4xl font-light mb-8">Instructor</h2>
              <div className="space-y-6 text-lg leading-relaxed">
                <p className="text-2xl font-light">
                  村田 良蔵（Ryozo Murata）<br />
                  <span className="text-base text-muted-foreground">1980年4月24日生まれ。北海道出身。</span>
                </p>
                <p>
                  ブラジリアン柔術において、北海道初のグレイシー直系黒帯。<br />
                  2018年・2019年、SJJIF世界選手権マスター2黒帯フェザー級 優勝。<br />
                  日本人初の世界チャンピオン。<br />
                  2025年、IBJJF世界マスター選手権 初出場で銅メダル（フェザー級黒帯マスター3）。
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
          <section className="py-16 max-w-4xl mx-auto">
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

          {/* Team Section */}
          <section className="py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-4xl font-light mb-8">Team</h2>
              <div className="space-y-8">
                {/* 村田 良蔵 */}
                <div className="border-l-2 border-primary pl-6">
                  <h3 className="text-2xl font-light mb-2">村田 良蔵（Ryozo Murata）</h3>
                  <p className="text-muted-foreground mb-3">創設者・インストラクター</p>
                  <div className="flex gap-4 text-sm">
                    <a href="https://www.ryozo-murata.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Website
                    </a>
                  </div>
                </div>

                {/* 濱田 */}
                <div className="border-l-2 border-primary pl-6">
                  <h3 className="text-2xl font-light mb-2">濱田</h3>
                  <p className="text-muted-foreground mb-3">メンバー</p>
                  <div className="flex gap-4 text-sm">
                    <a href="https://www.instagram.com/yukihamada/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Instagram → @yukihamada
                    </a>
                    <a href="https://x.com/yukihamada" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      X (Twitter) → @yukihamada
                    </a>
                  </div>
                </div>

                {/* 野島 */}
                <div className="border-l-2 border-primary pl-6">
                  <h3 className="text-2xl font-light mb-2">野島</h3>
                  <p className="text-muted-foreground">メンバー</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Form Section */}
          <section className="py-16 max-w-4xl mx-auto">
            <h2 className="text-4xl font-light mb-8">Contact</h2>
            <div className="space-y-6">
              <p className="text-lg">
                ✉️ お問い合わせ、新しい技の共有、ご提案などがございましたら、<br />
                お気軽にご連絡ください。
              </p>
              <div className="border border-border p-8 bg-muted/10 rounded-lg">
                <ContactForm />
              </div>
            </div>
          </section>

          {/* Invitation Section */}
          <section className="py-20 text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-4xl font-light mb-8">Invitation</h2>
              <p className="text-xl leading-relaxed">
                静かに、深く学ぶ柔術。<br />
                安全で、長くできて、強くなる。<br />
                その一歩を、ここから始めてみませんか？
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button onClick={() => navigate("/join")} size="lg" className="min-w-[200px]">
                  プランを見る
                </Button>
                <Button onClick={() => navigate("/login")} variant="outline" size="lg" className="min-w-[200px]">
                  ログイン
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
