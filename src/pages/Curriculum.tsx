import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead, getOGLocale } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Play, ChevronRight, BookOpen, Award, Video, Target, Shield } from "lucide-react";

// Curriculum data - public-facing technique categories with counts
// This is a static representation of what's available, not fetched from DB
const curriculumCategories = [
  {
    id: "guard-bottom",
    titleJa: "ガード（下からの攻防）",
    titleEn: "Guard (Bottom Game)",
    titlePt: "Guarda (Jogo por Baixo)",
    descJa: "クローズドガード、オープンガード、ハーフガード、デラヒーバ、スパイダーガードなど、下からの攻撃とスイープを体系的に学ぶ",
    descEn: "Systematically learn attacks and sweeps from closed guard, open guard, half guard, De La Riva, spider guard and more",
    descPt: "Aprenda sistematicamente ataques e raspagens da guarda fechada, aberta, meia guarda, De La Riva, aranha e mais",
    icon: Shield,
    techniqueCount: 45,
    videoCount: 60,
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    subcategories: [
      { ja: "クローズドガード", en: "Closed Guard", pt: "Guarda Fechada", count: 12 },
      { ja: "オープンガード", en: "Open Guard", pt: "Guarda Aberta", count: 8 },
      { ja: "ハーフガード", en: "Half Guard", pt: "Meia Guarda", count: 8 },
      { ja: "デラヒーバ", en: "De La Riva", pt: "De La Riva", count: 6 },
      { ja: "スパイダーガード", en: "Spider Guard", pt: "Guarda Aranha", count: 5 },
      { ja: "ラッソーガード", en: "Lasso Guard", pt: "Guarda Laco", count: 4 },
      { ja: "Xガード", en: "X Guard", pt: "Guarda X", count: 4 },
    ],
  },
  {
    id: "guard-pass",
    titleJa: "ガードパス（上からの攻略）",
    titleEn: "Guard Passing (Top Game)",
    titlePt: "Passagem de Guarda (Jogo por Cima)",
    descJa: "トレアンド、ニースライス、スタックパスなど、相手のガードを攻略する体系的なアプローチ",
    descEn: "Systematic approaches to passing guard including toreando, knee slice, stack pass and more",
    descPt: "Abordagens sistematicas para passagem de guarda incluindo toreando, corte de joelho e mais",
    icon: Target,
    techniqueCount: 30,
    videoCount: 40,
    color: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
    subcategories: [
      { ja: "クローズドガードパス", en: "Closed Guard Pass", pt: "Passagem da Guarda Fechada", count: 8 },
      { ja: "オープンガードパス", en: "Open Guard Pass", pt: "Passagem da Guarda Aberta", count: 8 },
      { ja: "ハーフガードパス", en: "Half Guard Pass", pt: "Passagem da Meia Guarda", count: 6 },
      { ja: "DLRパス", en: "DLR Pass", pt: "Passagem DLR", count: 4 },
      { ja: "スパイダーパス", en: "Spider Pass", pt: "Passagem Aranha", count: 4 },
    ],
  },
  {
    id: "submissions",
    titleJa: "サブミッション（極め技）",
    titleEn: "Submissions",
    titlePt: "Finalizacoes",
    descJa: "腕十字、三角絞め、キムラ、RNCなど、各ポジションからの極め技をポジション別に解説",
    descEn: "Armbar, triangle choke, kimura, RNC and more - submissions explained by position",
    descPt: "Armlock, triangulo, kimura, RNC e mais - finalizacoes explicadas por posicao",
    icon: Award,
    techniqueCount: 35,
    videoCount: 50,
    color: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    subcategories: [
      { ja: "腕十字", en: "Armbar", pt: "Armlock", count: 6 },
      { ja: "三角絞め", en: "Triangle Choke", pt: "Triangulo", count: 5 },
      { ja: "キムラ / アメリカーナ", en: "Kimura / Americana", pt: "Kimura / Americana", count: 6 },
      { ja: "チョーク系", en: "Chokes", pt: "Estrangulamentos", count: 10 },
      { ja: "レッグロック", en: "Leg Locks", pt: "Chaves de Perna", count: 8 },
    ],
  },
  {
    id: "takedowns",
    titleJa: "テイクダウン（立ち技）",
    titleEn: "Takedowns (Standing)",
    titlePt: "Takedowns (Em Pe)",
    descJa: "シングルレッグ、ダブルレッグ、足払いなど、安全で効果的なテイクダウン技術",
    descEn: "Single leg, double leg, trips and more - safe and effective takedown techniques",
    descPt: "Single leg, double leg, rasteiras e mais - takedowns seguros e eficazes",
    icon: Target,
    techniqueCount: 20,
    videoCount: 25,
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    subcategories: [
      { ja: "シングルレッグ", en: "Single Leg", pt: "Single Leg", count: 5 },
      { ja: "ダブルレッグ", en: "Double Leg", pt: "Double Leg", count: 4 },
      { ja: "足払い系", en: "Trips & Sweeps", pt: "Rasteiras", count: 6 },
      { ja: "引き込み", en: "Guard Pull", pt: "Puxada de Guarda", count: 5 },
    ],
  },
  {
    id: "top-control",
    titleJa: "トップコントロール（抑え込み）",
    titleEn: "Top Control (Pins)",
    titlePt: "Controle por Cima",
    descJa: "マウント、サイドコントロール、バックコントロールからの攻撃と維持",
    descEn: "Attacks and maintenance from mount, side control, and back control",
    descPt: "Ataques e manutencao da montada, controle lateral e controle das costas",
    icon: Shield,
    techniqueCount: 25,
    videoCount: 35,
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    subcategories: [
      { ja: "マウント", en: "Mount", pt: "Montada", count: 8 },
      { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos", count: 8 },
      { ja: "バックコントロール", en: "Back Control", pt: "Controle das Costas", count: 6 },
      { ja: "ニーオンベリー", en: "Knee on Belly", pt: "Joelho na Barriga", count: 3 },
    ],
  },
  {
    id: "escapes",
    titleJa: "エスケープ（脱出技術）",
    titleEn: "Escapes & Defense",
    titlePt: "Defesas e Escapadas",
    descJa: "不利なポジションからの脱出方法。マウントエスケープ、サイドエスケープ、バックエスケープなど",
    descEn: "Methods to escape from disadvantageous positions. Mount escape, side escape, back escape and more",
    descPt: "Metodos de escapada de posicoes desfavoraveis. Escapada da montada, lateral e costas",
    icon: Shield,
    techniqueCount: 20,
    videoCount: 25,
    color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
    subcategories: [
      { ja: "マウントエスケープ", en: "Mount Escape", pt: "Escapada da Montada", count: 5 },
      { ja: "サイドエスケープ", en: "Side Control Escape", pt: "Escapada Lateral", count: 5 },
      { ja: "バックエスケープ", en: "Back Escape", pt: "Escapada das Costas", count: 4 },
      { ja: "サブミッションディフェンス", en: "Submission Defense", pt: "Defesa de Finalizacao", count: 6 },
    ],
  },
];

// Learning path data
const learningPaths = [
  {
    titleJa: "白帯 初心者コース",
    titleEn: "White Belt Beginner Course",
    titlePt: "Curso Iniciante Faixa Branca",
    descJa: "柔術の基本姿勢、受身、基本テクニック30本で安全に始める",
    descEn: "Start safely with 30 fundamental techniques covering posture, breakfalls, and basics",
    descPt: "Comece com seguranca com 30 tecnicas fundamentais",
    level: "beginner",
    videoCount: 30,
  },
  {
    titleJa: "ガードゲーム完全攻略",
    titleEn: "Complete Guard Game Mastery",
    titlePt: "Dominio Completo do Jogo de Guarda",
    descJa: "クローズドガードからオープンガードまで、下からの攻防を体系的にマスター",
    descEn: "Master the bottom game systematically from closed guard to open guard",
    descPt: "Domine o jogo por baixo sistematicamente da guarda fechada a aberta",
    level: "intermediate",
    videoCount: 45,
  },
  {
    titleJa: "トップゲーム & パスガード",
    titleEn: "Top Game & Guard Passing",
    titlePt: "Jogo por Cima & Passagem de Guarda",
    descJa: "パスガードからコントロール、サブミッションまで上からの攻略法",
    descEn: "Guard passing to control to submission - complete top game approach",
    descPt: "Passagem de guarda ao controle e finalizacao - jogo por cima completo",
    level: "intermediate",
    videoCount: 40,
  },
  {
    titleJa: "サブミッション大全",
    titleEn: "Complete Submission Guide",
    titlePt: "Guia Completo de Finalizacoes",
    descJa: "全ポジションからの極め技とそのセットアップを網羅",
    descEn: "Cover all submissions from every position with setups",
    descPt: "Todas as finalizacoes de cada posicao com setups",
    level: "advanced",
    videoCount: 50,
  },
];

const Curriculum = () => {
  const { language } = useLanguage();

  const getLocalizedText = (obj: { ja: string; en: string; pt: string }) => {
    if (language === "ja") return obj.ja;
    if (language === "pt") return obj.pt;
    return obj.en;
  };

  const getText = (ja: string, en: string, pt?: string) => {
    if (language === "ja") return ja;
    if (language === "pt") return pt || en;
    return en;
  };

  const totalVideos = curriculumCategories.reduce((sum, cat) => sum + cat.videoCount, 0);
  const totalTechniques = curriculumCategories.reduce((sum, cat) => sum + cat.techniqueCount, 0);

  const seoContent = {
    ja: {
      title: "カリキュラム一覧 | JiuFlow - 200本以上のBJJテクニック動画",
      description: `${totalTechniques}以上の技術を${totalVideos}本以上の4K動画で体系的に学べるカリキュラム。ガード、パスガード、サブミッション、テイクダウン、エスケープを世界チャンピオン監修で。`,
    },
    en: {
      title: "Curriculum | JiuFlow - 200+ BJJ Technique Videos",
      description: `Learn ${totalTechniques}+ techniques with ${totalVideos}+ 4K videos. Guard, passing, submissions, takedowns, escapes - all supervised by a World Champion.`,
    },
    pt: {
      title: "Curriculo | JiuFlow - 200+ Videos de Tecnicas BJJ",
      description: `Aprenda ${totalTechniques}+ tecnicas com ${totalVideos}+ videos 4K. Guarda, passagem, finalizacoes, takedowns, defesas - supervisionado por Campeao Mundial.`,
    },
  };

  const currentSeo = seoContent[language as keyof typeof seoContent] || seoContent.ja;

  return (
    <div className="min-h-screen">
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl="/curriculum"
        ogImage="https://storage.googleapis.com/gpt-engineer-file-uploads/eKRz1NN3QtRy6vwWfmoNTmYXlqu2/social-images/social-1764815287708-Gemini_Generated_Image_o203l3o203l3o203.png"
        locale={getOGLocale(language)}
        keywords={language === "ja"
          ? ["柔術", "BJJ", "カリキュラム", "テクニック動画", "ブラジリアン柔術", "技術一覧", "柔術教室"]
          : language === "pt"
          ? ["jiu-jitsu", "BJJ", "curriculo", "tecnicas", "videos", "jiu-jitsu brasileiro"]
          : ["jiu-jitsu", "BJJ", "curriculum", "technique videos", "brazilian jiu-jitsu", "technique list"]}
        alternateLanguages={seoContent}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Course",
          "name": getText("JiuFlow ブラジリアン柔術カリキュラム", "JiuFlow Brazilian Jiu-Jitsu Curriculum"),
          "description": currentSeo.description,
          "provider": {
            "@type": "Organization",
            "name": "JiuFlow",
            "url": "https://jiuflow.art"
          },
          "courseMode": "online",
          "educationalLevel": "All Levels",
          "numberOfCredits": totalVideos,
          "teaches": "Brazilian Jiu-Jitsu",
          "instructor": {
            "@type": "Person",
            "name": "Ryozo Murata",
            "jobTitle": "2x SJJIF World Champion"
          }
        }}
      />
      <Navigation />

      <main className="pt-20 pb-16">
        {/* Hero */}
        <section className="px-6 py-16 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="max-w-5xl mx-auto text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium mb-6 inline-flex items-center gap-2">
              <Video className="w-4 h-4" />
              {getText(`${totalVideos}+`, `${totalVideos}+`)} {getText("本の動画", "videos")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-light mb-6">
              {getText("カリキュラム一覧", "Curriculum Overview", "Curriculo")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-light max-w-3xl mx-auto mb-8">
              {getText(
                "世界チャンピオン監修、4K俯瞰撮影。引き込みから極めまで、柔術の全技術体系を「流れ」で学べるカリキュラム。",
                "World Champion supervised, 4K overhead filming. Learn the complete BJJ system as connected flows, from guard pull to submission.",
                "Supervisionado por Campeao Mundial, filmagem 4K aerea. Aprenda o sistema completo de BJJ como fluxos conectados."
              )}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalTechniques}+</div>
                <div className="text-sm text-muted-foreground">{getText("テクニック", "Techniques", "Tecnicas")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{totalVideos}+</div>
                <div className="text-sm text-muted-foreground">{getText("動画", "Videos", "Videos")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">4K</div>
                <div className="text-sm text-muted-foreground">{getText("俯瞰撮影", "Overhead", "Aerea")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">3</div>
                <div className="text-sm text-muted-foreground">{getText("言語対応", "Languages", "Idiomas")}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join">
                <Button size="lg" className="min-w-[260px] text-lg font-medium shadow-lg hover:shadow-xl transition-all glow-primary">
                  <Play className="w-5 h-5 mr-2" />
                  {getText("1ヶ月無料で始める", "Start 1 Month Free", "Comecar 1 Mes Gratis")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Technique Categories */}
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-light mb-3">
                {getText("技術カテゴリ", "Technique Categories", "Categorias de Tecnicas")}
              </h2>
              <p className="text-muted-foreground">
                {getText(
                  "ポジション別・状況別に体系化された技術体系",
                  "Techniques systematized by position and situation",
                  "Tecnicas sistematizadas por posicao e situacao"
                )}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curriculumCategories.map((category) => {
                const Icon = category.icon;
                const title = language === "ja" ? category.titleJa : language === "pt" ? category.titlePt : category.titleEn;
                const desc = language === "ja" ? category.descJa : language === "pt" ? category.descPt : category.descEn;

                return (
                  <div
                    key={category.id}
                    className="glass-card rounded-xl p-6 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl border ${category.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">{title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{category.techniqueCount} {getText("テクニック", "techniques", "tecnicas")}</span>
                          <span>|</span>
                          <span>{category.videoCount} {getText("動画", "videos", "videos")}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{desc}</p>

                    {/* Subcategories */}
                    <div className="space-y-1.5">
                      {category.subcategories.map((sub, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                          <span className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            {getLocalizedText(sub)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {sub.count} {getText("本", "vids", "vids")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Learning Paths */}
        <section className="px-6 py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-light mb-3">
                {getText("学習パス", "Learning Paths", "Caminhos de Aprendizagem")}
              </h2>
              <p className="text-muted-foreground">
                {getText(
                  "レベル別のおすすめ学習コース",
                  "Recommended courses by level",
                  "Cursos recomendados por nivel"
                )}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {learningPaths.map((path, idx) => {
                const title = language === "ja" ? path.titleJa : language === "pt" ? path.titlePt : path.titleEn;
                const desc = language === "ja" ? path.descJa : language === "pt" ? path.descPt : path.descEn;
                const levelLabel = path.level === "beginner"
                  ? getText("初級", "Beginner", "Iniciante")
                  : path.level === "intermediate"
                  ? getText("中級", "Intermediate", "Intermediario")
                  : getText("上級", "Advanced", "Avancado");
                const levelColor = path.level === "beginner"
                  ? "bg-green-500/15 text-green-700 dark:text-green-300"
                  : path.level === "intermediate"
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                  : "bg-red-500/15 text-red-700 dark:text-red-300";

                return (
                  <div key={idx} className="glass-card rounded-xl p-6 hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={levelColor}>{levelLabel}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {path.videoCount} {getText("本の動画", "videos", "videos")}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Lock className="w-4 h-4" />
                      {getText("会員登録で全編視聴可能", "Full access with membership", "Acesso completo com assinatura")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sample Technique Map */}
        <section className="px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-light mb-3">
                {getText("技術の流れを体系で理解する", "Understand Technique Flows Systematically", "Entenda os Fluxos de Tecnica Sistematicamente")}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {getText(
                  "点の技術ではなく「線」で理解する。引き込みからサブミッションまで、全ての技がどう繋がるかを視覚的に把握できます。",
                  "Understand techniques as connected flows, not isolated moves. See how every technique connects from guard pull to submission.",
                  "Entenda tecnicas como fluxos conectados. Veja como cada tecnica se conecta da puxada a finalizacao."
                )}
              </p>
            </div>

            {/* Simplified flow preview */}
            <div className="glass-card rounded-xl p-8 mb-8">
              <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
                {[
                  getText("引き込み", "Guard Pull", "Puxada"),
                  getText("クローズドガード", "Closed Guard", "Guarda Fechada"),
                  getText("スイープ", "Sweep", "Raspagem"),
                  getText("マウント", "Mount", "Montada"),
                  getText("サブミッション", "Submission", "Finalizacao"),
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium border border-primary/20">
                      {step}
                    </div>
                    {idx < 4 && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                {getText(
                  "会員になると200本以上の動画で、各ステップの詳細テクニックを学べます",
                  "As a member, learn detailed techniques for each step with 200+ videos",
                  "Como membro, aprenda tecnicas detalhadas com 200+ videos"
                )}
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              {getText(
                "今日から始める、一生モノの柔術",
                "Start Today, Jiu-Jitsu for Life",
                "Comece Hoje, Jiu-Jitsu Para a Vida"
              )}
            </h2>
            <p className="text-lg text-muted-foreground font-light mb-8 max-w-2xl mx-auto">
              {getText(
                "世界チャンピオンが体系化した技術を、4K映像で学ぶ。1ヶ月の無料トライアルで全カリキュラムにアクセス。",
                "Learn techniques systematized by a World Champion in 4K. Access the full curriculum with a 1-month free trial.",
                "Aprenda tecnicas sistematizadas por um Campeao Mundial em 4K. Acesse todo o curriculo com 1 mes gratis."
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/join">
                <Button size="lg" className="min-w-[280px] text-lg font-medium shadow-lg hover:shadow-xl transition-all glow-primary">
                  {getText("1ヶ月無料で始める", "Start 1 Month Free", "Comecar 1 Mes Gratis")}
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  {getText("詳しく見る", "Learn More", "Saiba Mais")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Curriculum;
