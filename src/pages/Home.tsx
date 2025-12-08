import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { translations } from "@/lib/translations";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import TechniqueFlowchart from "@/components/TechniqueFlowchart";
import { Badge } from "@/components/ui/badge";
import { Award, Play, BookOpen, FileText, CheckCircle } from "lucide-react";
import murataImage from "@/assets/murata-ryozo-portrait.jpg";
import kimuraLockImage from "@/assets/kimura-lock-overhead.png";

const Home = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useTranslation();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const homeT = t.home as typeof translations.ja.home; // Type assertion for full home type
  const isLoading = false;

  useEffect(() => {
    const titles = {
      ja: "jiuflow | 柔術を、体系で学ぶ",
      en: "jiuflow | Learn Jiu-Jitsu with Clarity",
      pt: "jiuflow | Aprenda Jiu-Jitsu com Clareza"
    };
    
    const descriptions = {
      ja: "上面からの4K撮影、体系化された流れ、構造と意図の言語化。安全で、長く、そして強い一生モノの柔術を、あなたに。",
      en: "4K overhead filming, systematic flows, verbalized structure and intent. Safe, lasting, and strong lifelong Jiu-Jitsu for you.",
      pt: "Filmagem aérea 4K, fluxos sistemáticos, estrutura e intenção verbalizadas. Jiu-Jitsu seguro, duradouro e forte para toda a vida."
    };
    
    document.title = titles[language] || titles.ja;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptions[language] || descriptions.ja);
    }
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', titles[language] || titles.ja);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', descriptions[language] || descriptions.ja);
    }
  }, [language]);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-16">
        {isLoading ? (
          <div className="animate-fade-in">
            {/* Hero Skeleton */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-muted animate-pulse" />
              <div className="relative z-10 text-center px-6 max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-20 w-3/4 mx-auto" />
                <Skeleton className="h-8 w-2/3 mx-auto" />
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                  <Skeleton className="h-12 w-[200px] mx-auto sm:mx-0" />
                  <Skeleton className="h-12 w-[200px] mx-auto sm:mx-0" />
                </div>
              </div>
            </section>

            {/* Clarity Section Skeleton */}
            <section className="py-32 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-20 space-y-4">
                  <Skeleton className="h-16 w-2/3 mx-auto" />
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                </div>
                <div className="grid md:grid-cols-3 gap-12">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center space-y-4">
                      <Skeleton className="w-20 h-20 mx-auto rounded-lg" />
                      <Skeleton className="h-6 w-2/3 mx-auto" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col overflow-hidden">
              {/* Large Overhead Image */}
              <div className="relative w-full h-[70vh] md:h-[80vh]">
                <img 
                  src={kimuraLockImage} 
                  alt="4K Overhead View - Kimura Lock"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
              </div>
              
              {/* Content overlay at bottom */}
              <div className="relative z-10 -mt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center animate-fade-up space-y-8">
                  <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {t.home.hero.title}
                  </h1>
                  <p className="text-xl md:text-2xl font-light text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-pre-line">
                    {t.home.hero.subtitle}
                  </p>
                  
                  {/* Value Proposition */}
                  <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg p-6 max-w-2xl mx-auto">
                    <p className="text-lg md:text-xl font-light text-white whitespace-pre-line">
                      {t.home.hero.valueProposition}
                    </p>
                  </div>
                  
                  {!user && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                      <Link to="/join" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full sm:min-w-[240px] text-lg font-medium bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                          {t.home.hero.freeTrial}
                        </Button>
                      </Link>
                      <Link to="/login" className="w-full sm:w-auto">
                        <Button variant="outline" size="lg" className="w-full sm:min-w-[200px] bg-transparent border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                          {t.nav.login}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </section>


            {/* Instructor Section - "Who You Learn From" */}
            <section className="py-24 px-6 bg-gradient-to-br from-primary/5 via-background to-primary/10">
              <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Photo */}
                  <div className="relative">
                    <div className="absolute -top-4 -left-4 z-10">
                      <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        {homeT.instructor?.badge || "世界チャンピオン監修"}
                      </Badge>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                      <img 
                        src={murataImage} 
                        alt="村田良蔵 - Ryozo Murata"
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <p className="text-white/90 text-lg italic font-light">
                          {homeT.instructor?.quote || "「怪我なく勝つ。理詰めで動く。それが大人の柔術。」"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-light mb-4">
                        {homeT.instructor?.title || "誰から学ぶか、が全てを変える"}
                      </h2>
                      <div className="flex items-center gap-3 mb-6">
                        <h3 className="text-2xl font-medium">{homeT.instructor?.name || "村田 良蔵"}</h3>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{homeT.instructor?.subtitle || "Ryozo Murata | 黒帯・世界王者"}</span>
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className="space-y-3">
                      {(homeT.instructor?.credentials || [
                        "SJJIF世界選手権 2連覇（日本人初）",
                        "IBJJF世界マスター 銅メダル",
                        "北海道初のグレイシー直系黒帯"
                      ]).map((credential: string, index: number) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-lg">{credential}</span>
                        </div>
                      ))}
                    </div>

                    <Link to="/about">
                      <Button variant="outline" size="lg" className="mt-6">
                        {homeT.instructor?.cta || "指導者について詳しく見る"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Demo Video Section */}
            <section className="py-24 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-light mb-4">
                    {homeT.demo?.title || "技マップの使い方"}
                  </h2>
                  <p className="text-lg text-muted-foreground font-light">
                    {homeT.demo?.subtitle || "実際の指導風景と、JiuFlowでの学び方をご覧ください"}
                  </p>
                </div>

                {/* Video Placeholder */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted border border-border shadow-xl">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors group">
                        <Play className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <p className="text-muted-foreground">
                        {homeT.demo?.placeholder || "デモ動画を再生"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Technique Flowchart Section */}
            <section className="py-24 px-6 bg-muted/30">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-light mb-4">
                    {language === 'ja' ? '技術マップ' : language === 'pt' ? 'Mapa de Técnicas' : 'Technique Map'}
                  </h2>
                  <p className="text-lg text-muted-foreground font-light">
                    {language === 'ja' ? '柔術の技術体系を視覚的に理解する' : language === 'pt' ? 'Visualize a estrutura do Jiu-Jitsu' : 'Visualize the structure of Jiu-Jitsu'}
                  </p>
                </div>
                <TechniqueFlowchart />
              </div>
            </section>

            {/* SEO Section - Blog & Glossary */}
            <section className="py-24 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-light mb-4">
                    {homeT.seo?.title || "柔術を深く学ぶ"}
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Blog Card */}
                  <div className="group relative bg-card rounded-2xl border border-border p-8 hover:border-primary/50 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3">
                      {homeT.seo?.blogTitle || "JiuFlow Blog"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {homeT.seo?.blogDesc || "柔術の技術解説、練習のコツ、大会レポートなど"}
                    </p>
                    <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {homeT.seo?.blogCta || "ブログを読む"}
                    </Button>
                  </div>

                  {/* Glossary Card */}
                  <div className="group relative bg-card rounded-2xl border border-border p-8 hover:border-primary/50 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-2xl font-medium mb-3">
                      {homeT.seo?.glossaryTitle || "柔術用語集"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {homeT.seo?.glossaryDesc || "初心者から上級者まで使える柔術用語辞典"}
                    </p>
                    <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {homeT.seo?.glossaryCta || "用語集を見る"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Closing CTA Section */}
            <section className="py-24 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-5xl font-light mb-6">
                  {language === 'ja' ? '今日から始める、一生モノの柔術' : 
                   language === 'pt' ? 'Comece Hoje, Jiu-Jitsu Para a Vida' : 
                   'Start Today, Jiu-Jitsu for Life'}
                </h2>
                <p className="text-xl text-muted-foreground font-light mb-10 max-w-2xl mx-auto">
                  {language === 'ja' ? '世界チャンピオンが体系化した技術を、4K映像で学ぶ。怪我なく、長く、強くなれる柔術がここにあります。' :
                   language === 'pt' ? 'Aprenda técnicas sistematizadas por um campeão mundial em vídeo 4K. Jiu-Jitsu seguro, duradouro e forte está aqui.' :
                   'Learn techniques systematized by a world champion in 4K video. Safe, lasting, and strong Jiu-Jitsu is here.'}
                </p>
                
                {!user && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/join">
                      <Button size="lg" className="min-w-[280px] text-lg font-medium shadow-lg hover:shadow-xl transition-all">
                        {language === 'ja' ? '1ヶ月無料で始める' : 
                         language === 'pt' ? 'Começar 1 Mês Grátis' : 
                         'Start 1 Month Free'}
                      </Button>
                    </Link>
                    <Link to="/about">
                      <Button variant="outline" size="lg" className="min-w-[200px]">
                        {language === 'ja' ? '詳しく見る' : 
                         language === 'pt' ? 'Saiba Mais' : 
                         'Learn More'}
                      </Button>
                    </Link>
                  </div>
                )}
                
                {user && (
                  <Link to="/my-page">
                    <Button size="lg" className="min-w-[280px] text-lg font-medium">
                      {language === 'ja' ? 'マイページへ' : 
                       language === 'pt' ? 'Minha Página' : 
                       'My Page'}
                    </Button>
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
