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
import { ArrowRight, Lock, PlayCircle, UserX, Trophy, Users, BookOpen, Instagram } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import murataImage from "@/assets/murata-ryozo.jpg";

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
            <p className="text-2xl md:text-3xl font-light mb-4 max-w-3xl mx-auto">
              安全で、長く続けられ、かつ試合でも強い。<br />
              我々が考える「いい柔術」を広める
            </p>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              それが、私たちのミッションです。
            </p>
          </section>

          {/* Flow Chart Section - Temporarily hidden for reconstruction */}
          {/* <section className="py-16 max-w-5xl mx-auto">
            <h2 className="text-4xl font-light mb-12 text-center">技の流れ</h2>
            
            {isLoading ? (
              <div className="space-y-8">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <div className="space-y-12">
                <ScrollArea className="w-full">
                  <div className="flex items-center gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                    {techniqueStats.map((stat, index) => (
                    <div key={stat.category} className="flex items-center gap-4 flex-shrink-0">
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
                      
                      {index < techniqueStats.length - 1 && (
                        <ArrowRight className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

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
                      ? "✨ 毎月新しい動画をアップデート" 
                      : language === "pt" 
                      ? "✨ Novos vídeos mensalmente" 
                      : "✨ New videos every month"}
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
          </section> */}


          {/* Mission Section */}
          <section className="py-16 max-w-4xl mx-auto">
            <h2 className="text-4xl font-light mb-8 text-center">我々が考える「いい柔術」とは。</h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                柔術は本来、力の弱い者が強い者を制するために生まれた技術です。<br />
                しかし、練習で怪我をしてしまったり、年齢と共に体力が落ちて続けられなくなっては意味がありません。
              </p>
              <p>
                私たちのミッションは明確です。<br />
                <strong>「安全で、長くできて、試合でも強い柔術」</strong>を広めること。
              </p>
              <p>
                無理な力に頼らず、身体の構造と理（ことわり）を使うこと。<br />
                それは怪我のリスクを最小限に抑えるだけでなく、<br />
                世界選手権という最高峰の舞台でも通用する「本当の強さ」に直結します。
              </p>
              <p>
                JiuFlowは、その技術体系を誰もが学べる形で提供します。
              </p>
            </div>
          </section>

          {/* Message Video Section */}
          <section className="py-20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-10 animate-fade-in">
                <h2 className="text-4xl font-light mb-4">創設者からのメッセージ</h2>
                <p className="text-xl text-muted-foreground font-light">
                  なぜこのサービスを作ったのか？<br />
                  村田良蔵が語る、JiuFlowに込めた想い
                </p>
              </div>
              
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl bg-muted animate-scale-in">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/h982P-og66w"
                  title="創設者からのメッセージ"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* Instructor Section */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-4xl font-light mb-12">Instructor</h2>
              
              <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                {/* Image */}
                <div className="w-full md:w-1/3 flex-shrink-0">
                  <img 
                    src={murataImage} 
                    alt="村田 良蔵 (Ryozo Murata)"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
                
                {/* Profile Text */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-2xl font-light mb-2">村田 良蔵（Ryozo Murata）</h3>
                    <p className="text-xl font-light italic text-primary border-l-4 border-primary pl-4 py-2">
                      「怪我なく勝つ。理詰めで動く。それが大人の柔術。」
                    </p>
                  </div>
                  
                  <p className="text-lg leading-relaxed">
                    1980年生まれ、北海道出身。<br />
                    北海道初のグレイシー直系黒帯として、40代を迎えた今なお世界の第一線で進化を続ける「実践する指導者」。
                  </p>
                  
                  <p className="text-lg leading-relaxed">
                    彼の強さの秘密は、フィジカル（筋力）への依存を捨て、身体構造（骨格・重心）を最大限に活かす<strong>「理（ことわり）の柔術」</strong>にあります。ヨガやウェルネスの知見を融合させたそのメソッドは、怪我のリスクを最小限に抑えながら、確実な強さを手に入れるための最適解です。
                  </p>
                </div>
              </div>
              
              {/* Achievements */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="w-6 h-6 text-primary" />
                    <h4 className="text-xl font-light">主な戦績 - Strength</h4>
                  </div>
                  <ul className="space-y-3 text-lg leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>世界王者:</strong> 2018・2019年 SJJIF世界選手権 マスター2黒帯フェザー級 優勝（日本人初・連覇）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>世界への挑戦:</strong> 2025年 IBJJF世界マスター選手権 銅メダル（フェザー級黒帯マスター3）</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-primary" />
                    <h4 className="text-xl font-light">指導と普及 - Leadership</h4>
                  </div>
                  <ul className="space-y-3 text-lg leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>道場経営:</strong> Over Limit 札幌、YAWARA JIU-JITSU ACADEMY、SWEEP JIU-JITSU ACADEMY 代表。特にYAWARAは設立から短期間で全日本選手権等の団体優勝を重ねる強豪へ成長。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>組織運営:</strong> NPO法人スポーツ柔術日本連盟（SJJJF）代表理事として、柔術の社会的地位向上と普及に尽力。</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Message */}
              <div className="bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-primary p-8 rounded-r-lg">
                <div className="flex items-start gap-3 mb-4">
                  <BookOpen className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <h4 className="text-xl font-light">Message</h4>
                </div>
                <p className="text-lg leading-relaxed italic">
                  「柔術は、正しく学べば一生続けられるライフワークになります。痛みに耐えるのではなく、仕組みを理解する楽しさを。私が辿り着いた『安全で強い柔術』を、ぜひ体感してください。」
                </p>
              </div>
            </div>
          </section>

          {/* Philosophy Section */}
          <section className="py-16 max-w-4xl mx-auto">
            <h2 className="text-4xl font-light mb-8">Philosophy</h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                柔術は、常にアップデートされる「生きた学問」です。
              </p>
              <p>
                私たちは現時点で「最も理にかなっている」と思える方法を提供していますが、<br />
                それがゴールではありません。
              </p>
              <p>
                「安全に、長く、強く」。<br />
                この基準を満たすより良い方法があれば、私たちは柔軟に取り入れ、進化し続けます。
              </p>
              <p>
                柔術を通じて、世界中の人々が健康的に、長くマットの上に立ち続けられるように。<br />
                私たちと一緒に、柔術の深淵を探求していきましょう。
              </p>
            </div>
          </section>

          {/* Invitation Section */}
          <section className="py-20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="max-w-3xl mx-auto px-6 text-center">
              <h2 className="text-4xl md:text-5xl font-light mb-6">
                静かに、深く。そして強く。
              </h2>
              <div className="space-y-4 text-lg leading-relaxed mb-10">
                <p>
                  あなたの柔術ライフを、より安全で、より豊かなものへ。<br />
                  試合で勝つための技術も、一生続けるための身体操作も、すべてここにあります。
                </p>
                <p className="text-xl font-light">
                  その一歩を、ここから始めてみませんか？
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate("/join")} size="lg">
                  {language === "ja" ? "プランを見る" : language === "pt" ? "Ver Planos" : "View Plans"}
                </Button>
                <Button onClick={() => navigate("/login")} variant="outline" size="lg">
                  {language === "ja" ? "ログイン" : language === "pt" ? "Entrar" : "Login"}
                </Button>
              </div>
            </div>
          </section>

          {/* Contact Form Section */}
          <section className="py-16 max-w-4xl mx-auto">
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

          {/* Team Section */}
          <section className="py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto px-6">
              <h2 className="text-4xl font-light mb-6">Team</h2>
              <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
                JiuFlowは、柔術家、クリエイター、エンジニアが連携し、<br />
                「最高の学習体験」を作るために活動しています。
              </p>
              
              <div className="space-y-8">
                {/* 村田 良蔵 */}
                <div className="border-l-2 border-primary pl-6 hover:bg-muted/20 p-4 -ml-4 transition-colors rounded-r-lg">
                  <h3 className="text-2xl font-light mb-1">村田 良蔵 (Ryozo Murata)</h3>
                  <p className="text-primary font-medium mb-2">Founder / Head Instructor</p>
                  <p className="text-muted-foreground mb-3">メソッド開発・技術監修</p>
                  <div className="flex gap-4 text-sm">
                    <a 
                      href="https://www.ryozo-murata.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Website
                    </a>
                    <a 
                      href="https://www.instagram.com/ryozomurata/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                    <a 
                      href="https://x.com/ryozomurata" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X (Twitter)
                    </a>
                  </div>
                </div>

                {/* 濱田 優貴 */}
                <div className="border-l-2 border-primary pl-6 hover:bg-muted/20 p-4 -ml-4 transition-colors rounded-r-lg">
                  <h3 className="text-2xl font-light mb-1">濱田 優貴 (Yuki Hamada)</h3>
                  <p className="text-primary font-medium mb-2">Co-Founder / Creative</p>
                  <p className="text-muted-foreground leading-relaxed">
                    株式会社サイブリッジ創業者、元株式会社メルカリ取締役CINO。<br />
                    JiuFlowではクリエイティブディレクションを担当。<br />
                    デザイン、情報設計、AI開発を通じ、村田良蔵の技術を「見やすく、分かりやすい」形に落とし込んでいる。
                  </p>
                  <div className="flex gap-4 text-sm mt-3">
                    <a 
                      href="https://www.instagram.com/yukihamada/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                    <a 
                      href="https://x.com/yukihamada" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X (Twitter)
                    </a>
                  </div>
                </div>

                {/* 野島 */}
                <div className="border-l-2 border-primary pl-6 hover:bg-muted/20 p-4 -ml-4 transition-colors rounded-r-lg">
                  <h3 className="text-2xl font-light mb-1">野島 (Nojima)</h3>
                  <p className="text-primary font-medium mb-2">Engineering / Member</p>
                  <p className="text-muted-foreground mb-3">システム開発・テクニカルサポート</p>
                  <div className="flex gap-4 text-sm">
                    <a 
                      href="https://www.instagram.com/nojisgk/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                    <a 
                      href="https://x.com/ShigeakiNojima" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X (Twitter)
                    </a>
                  </div>
                </div>
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
