import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { translations } from "@/lib/translations";
import { useHeroImages } from "@/hooks/useHeroImages";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import TechniqueFlowchart from "@/components/TechniqueFlowchart";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen, FileText, CheckCircle, Users, Trophy } from "lucide-react";
import { SEOHead, getOGLocale } from "@/components/SEOHead";
import { TypewriterText } from "@/components/TypewriterText";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { AnimatedSection } from "@/components/AnimatedSection";
import murataImage from "@/assets/murata-ryozo-portrait.jpg";
import kimuraLockImage from "@/assets/kimura-lock-overhead.png";

const Home = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useTranslation();
  const t = translations[language] || translations.ja; // Fallback to Japanese
  const homeT = t.home as typeof translations.ja.home; // Type assertion for full home type
  const { images, isLoading, currentIndex, totalImages } = useHeroImages();

  const seoContent = {
    ja: {
      title: "JiuFlow | 柔術を、体系で学ぶ - ブラジリアン柔術技術動画",
      description: "上面からの4K撮影、体系化された流れ、構造と意図の言語化。安全で、長く、そして強い一生モノの柔術を、あなたに。世界チャンピオン監修。",
      ogImage: "https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png"
    },
    en: {
      title: "JiuFlow | Learn Jiu-Jitsu Systematically - BJJ Technique Videos",
      description: "4K overhead filming, systematic flows, verbalized structure and intent. Safe, lasting, and strong lifelong Jiu-Jitsu for you. World Champion supervised.",
      ogImage: "https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png"
    },
    pt: {
      title: "JiuFlow | Aprenda Jiu-Jitsu Sistematicamente - Vídeos de Técnicas BJJ",
      description: "Filmagem aérea 4K, fluxos sistemáticos, estrutura e intenção verbalizadas. Jiu-Jitsu seguro, duradouro e forte. Supervisionado por Campeão Mundial.",
      ogImage: "https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png"
    }
  };

  const currentSeo = seoContent[language] || seoContent.ja;
  const langPath = language === 'ja' ? '' : `/${language}`;

  return (
    <div className="min-h-screen">
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl={langPath || "/"}
        ogImage={currentSeo.ogImage}
        locale={getOGLocale(language)}
        keywords={language === 'ja' 
          ? ['柔術', 'BJJ', 'ブラジリアン柔術', '技術動画', '武道', '柔術教室', '格闘技', '世界チャンピオン']
          : language === 'pt'
          ? ['jiu-jitsu', 'BJJ', 'jiu-jitsu brasileiro', 'vídeos técnicos', 'artes marciais', 'academia']
          : ['jiu-jitsu', 'BJJ', 'brazilian jiu-jitsu', 'technique videos', 'martial arts', 'grappling']}
        alternateLanguages={seoContent}
      />
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
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
              {/* Background Image/Video */}
              <div className="absolute inset-0 bg-muted">
                {images.length > 0 ? (
                  <>
                    {/* Multiple images overlaid with fade transitions */}
                    {images.map((image, idx) => (
                      <div
                        key={image.id}
                        className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                        style={{ opacity: idx === currentIndex ? 1 : 0 }}
                      >
                        <img 
                          src={image.url} 
                          alt={language === 'ja' ? `ブラジリアン柔術トレーニング風景 ${idx + 1}` : language === 'pt' ? `Treino de Jiu-Jitsu Brasileiro ${idx + 1}` : `Brazilian Jiu-Jitsu Training Scene ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🥋</div>
                      <p className="text-sm">4K Overhead View</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-up space-y-8">
                <h1 className="text-6xl md:text-8xl font-light mb-4 tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {t.home.hero.title}
                </h1>
                <div className="h-16 md:h-20 flex items-center justify-center">
                  <TypewriterText
                    texts={
                      language === 'ja' 
                        ? [
                            "怪我なく、長く、強く。",
                            "理詰めで動く、大人の柔術。",
                            "世界チャンピオン監修。",
                            "4K俯瞰撮影で細部まで。",
                            "体系化された、一生モノの技術。"
                          ]
                        : language === 'pt'
                        ? [
                            "Sem lesões. Duradouro. Forte.",
                            "Jiu-Jitsu lógico para adultos.",
                            "Supervisionado por Campeão Mundial.",
                            "Filmagem 4K aérea em detalhes.",
                            "Técnicas sistematizadas para a vida."
                          ]
                        : [
                            "No injuries. Lasting. Strong.",
                            "Logical Jiu-Jitsu for adults.",
                            "World Champion supervised.",
                            "4K overhead filming in detail.",
                            "Systematic techniques for life."
                          ]
                    }
                    className="text-xl md:text-3xl font-light text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    cursorClassName="bg-white"
                    typingSpeed={60}
                    deletingSpeed={30}
                    pauseTime={3000}
                  />
                </div>
                
                {/* Value Proposition - Glass Card */}
                <div className="glass-card rounded-xl p-6 max-w-2xl mx-auto">
                  <p className="text-lg md:text-xl font-light text-foreground whitespace-pre-line">
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
            </section>

            {/* 4K Overhead Image Section */}
            <AnimatedSection>
              <section className="py-20 px-6 bg-background">
                <div className="max-w-5xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-light mb-3">
                      {language === 'ja' ? '上面からの4K撮影' : language === 'pt' ? 'Filmagem 4K Aérea' : '4K Overhead Filming'}
                    </h2>
                    <p className="text-lg text-muted-foreground font-light">
                      {language === 'ja' ? '細部まで見逃さない、プロ仕様の撮影' : language === 'pt' ? 'Filmagem profissional que não perde nenhum detalhe' : 'Professional filming that captures every detail'}
                    </p>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden shadow-xl">
                    <img 
                      src={kimuraLockImage} 
                      alt={language === 'ja' ? '4K上面撮影 - キムラロック（腕絡み）の技術解説' : language === 'pt' ? 'Filmagem 4K Aérea - Técnica Kimura Lock' : '4K Overhead View - Kimura Lock Technique Tutorial'}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>
              </section>
            </AnimatedSection>

            {/* Instructor Section - "Who You Learn From" */}
            <AnimatedSection delay={100}>
              <section className="py-24 px-6 relative overflow-hidden">
                {/* Subtle background accent */}
                <div className="absolute inset-0 -z-10">
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
                </div>
                
                <div className="max-w-5xl mx-auto">
                  {/* Section header */}
                  <div className="text-center mb-16">
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium mb-6 inline-flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {homeT.instructor?.badge || "世界チャンピオン監修"}
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-light">
                      {homeT.instructor?.title || "誰から学ぶか、が全てを変える"}
                    </h2>
                  </div>

                  <div className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-center">
                    {/* Photo - constrained on PC */}
                    <div className="lg:col-span-2 flex justify-center">
                      <div className="relative w-full max-w-[320px]">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[3/4]">
                          <img 
                            src={murataImage} 
                            alt={language === 'ja' ? '村田良蔵 - SJJIF世界選手権2連覇の柔術世界王者' : language === 'pt' ? 'Ryozo Murata - Bicampeão Mundial SJJIF de Jiu-Jitsu' : 'Ryozo Murata - 2x SJJIF World Champion BJJ Black Belt'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-5">
                            <p className="text-white/90 text-sm italic font-light leading-relaxed">
                              {homeT.instructor?.quote || "「怪我なく勝つ。理詰めで動く。それが大人の柔術。」"}
                            </p>
                          </div>
                        </div>
                        {/* Decorative ring */}
                        <div className="absolute -inset-3 rounded-2xl border border-primary/10 -z-10" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-6">
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-medium">{homeT.instructor?.name || "村田 良蔵"}</h3>
                        <span className="text-muted-foreground block mt-1 text-sm tracking-wider uppercase">{homeT.instructor?.subtitle || "Ryozo Murata | 黒帯・世界王者"}</span>
                      </div>

                      {/* Credentials as glass cards */}
                      <div className="space-y-2.5">
                        {(homeT.instructor?.credentials || [
                          "SJJIF世界選手権 2連覇（日本人初）",
                          "IBJJF世界マスター 銅メダル",
                          "北海道初のグレイシー直系黒帯"
                        ]).map((credential: string, index: number) => (
                          <div key={index} className="flex items-center gap-3 glass-card rounded-lg px-4 py-3">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm sm:text-base">{credential}</span>
                          </div>
                        ))}
                      </div>

                      <Link to="/about">
                        <Button variant="outline" size="lg" className="mt-4">
                          {homeT.instructor?.cta || "指導者について詳しく見る"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </AnimatedSection>


            {/* Technique Flowchart Section */}
            <AnimatedSection delay={150}>
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
            </AnimatedSection>

            {/* SEO Section - Explore Jiu-Jitsu */}
            <AnimatedSection delay={200}>
              <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-light mb-3">
                      {homeT.seo?.title || "柔術を深く学ぶ"}
                    </h2>
                    <p className="text-muted-foreground">
                      {language === 'ja' ? '選手・大会情報から用語まで、柔術の世界を探索' : 
                       language === 'pt' ? 'Explore o mundo do Jiu-Jitsu: atletas, torneios e terminologia' : 
                       'Explore the world of Jiu-Jitsu: athletes, tournaments, and terminology'}
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Athletes Card */}
                    <Link to="/athletes" className="group glass-card rounded-xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">
                        {language === 'ja' ? '選手一覧' : language === 'pt' ? 'Atletas' : 'Athletes'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ja' ? '世界の柔術家プロフィール' : language === 'pt' ? 'Perfis de lutadores mundiais' : 'World fighter profiles'}
                      </p>
                    </Link>

                    {/* Tournaments Card */}
                    <Link to="/tournaments" className="group glass-card rounded-xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">
                        {language === 'ja' ? '大会一覧' : language === 'pt' ? 'Torneios' : 'Tournaments'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ja' ? '国内外の大会スケジュール' : language === 'pt' ? 'Calendário de competições' : 'Competition calendar'}
                      </p>
                    </Link>

                    {/* Blog Card */}
                    <Link to="/blog" className="group glass-card rounded-xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">
                        {homeT.seo?.blogTitle || "ブログ"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ja' ? '開発記録・お知らせ' : language === 'pt' ? 'Atualizações e notícias' : 'Updates and news'}
                      </p>
                    </Link>

                    {/* Glossary Card */}
                    <Link to="/glossary" className="group glass-card rounded-xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">
                        {homeT.seo?.glossaryTitle || "用語集"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ja' ? '柔術用語辞典' : language === 'pt' ? 'Dicionário de termos' : 'Terminology dictionary'}
                      </p>
                    </Link>
                  </div>
                </div>
              </section>
            </AnimatedSection>

            {/* Closing CTA Section */}
            <AnimatedSection delay={250}>
              <section className="py-24 px-6 relative overflow-hidden">
                {/* Animated background orbs */}
                <div className="absolute inset-0 -z-10">
                  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
                  <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
                </div>
                
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
                        <Button size="lg" className="min-w-[280px] text-lg font-medium shadow-lg hover:shadow-xl transition-all glow-primary">
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
                      <Button size="lg" className="min-w-[280px] text-lg font-medium glow-primary">
                        {language === 'ja' ? 'マイページへ' : 
                         language === 'pt' ? 'Minha Página' : 
                         'My Page'}
                      </Button>
                    </Link>
                  )}
                </div>
              </section>
            </AnimatedSection>
          </>
        )}
      </main>
      
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default Home;
