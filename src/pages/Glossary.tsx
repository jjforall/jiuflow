import { useState, useMemo, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen } from "lucide-react";

interface GlossaryTerm {
  term: string;
  termJa: string;
  termPt: string;
  definition: string;
  definitionJa: string;
  definitionPt: string;
  category: string;
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: "Guard",
    termJa: "ガード",
    termPt: "Guarda",
    definition: "A ground position where you control your opponent using your legs, hips, and grips.",
    definitionJa: "足、腰、グリップを使って相手をコントロールする寝技のポジション。",
    definitionPt: "Uma posição no chão onde você controla seu oponente usando suas pernas, quadris e pegadas.",
    category: "position"
  },
  {
    term: "Mount",
    termJa: "マウント",
    termPt: "Montada",
    definition: "A dominant position where you sit on top of your opponent's torso.",
    definitionJa: "相手の胴体の上に座る支配的なポジション。",
    definitionPt: "Uma posição dominante onde você senta no tronco do oponente.",
    category: "position"
  },
  {
    term: "Side Control",
    termJa: "サイドコントロール",
    termPt: "Cem Quilos",
    definition: "A dominant position where you pin your opponent from the side.",
    definitionJa: "相手を横から押さえ込む支配的なポジション。",
    definitionPt: "Uma posição dominante onde você prende seu oponente de lado.",
    category: "position"
  },
  {
    term: "Back Control",
    termJa: "バックコントロール",
    termPt: "Pegada nas Costas",
    definition: "A position where you control your opponent from behind, typically with hooks in.",
    definitionJa: "相手の背後からコントロールするポジション。通常はフックを入れる。",
    definitionPt: "Uma posição onde você controla seu oponente por trás, geralmente com ganchos.",
    category: "position"
  },
  {
    term: "Closed Guard",
    termJa: "クローズドガード",
    termPt: "Guarda Fechada",
    definition: "A guard position where your legs are wrapped around your opponent's waist with ankles crossed.",
    definitionJa: "足首を交差させて相手の腰に足を巻きつけるガードポジション。",
    definitionPt: "Uma posição de guarda onde suas pernas envolvem a cintura do oponente com os tornozelos cruzados.",
    category: "position"
  },
  {
    term: "Half Guard",
    termJa: "ハーフガード",
    termPt: "Meia Guarda",
    definition: "A guard position where you control one of your opponent's legs between yours.",
    definitionJa: "相手の片足を自分の両足の間に挟んでコントロールするガードポジション。",
    definitionPt: "Uma posição de guarda onde você controla uma das pernas do oponente entre as suas.",
    category: "position"
  },
  {
    term: "Armbar",
    termJa: "腕十字固め",
    termPt: "Armlock",
    definition: "A submission that hyperextends the elbow joint.",
    definitionJa: "肘関節を過伸展させる極め技。",
    definitionPt: "Uma finalização que hiperextende a articulação do cotovelo.",
    category: "submission"
  },
  {
    term: "Kimura",
    termJa: "キムラ",
    termPt: "Kimura",
    definition: "A shoulder lock named after Masahiko Kimura, applied by rotating the arm behind the back.",
    definitionJa: "木村政彦にちなんで名付けられた肩関節技。腕を背中の後ろに回して極める。",
    definitionPt: "Uma chave de ombro com o nome de Masahiko Kimura, aplicada girando o braço para trás das costas.",
    category: "submission"
  },
  {
    term: "Americana",
    termJa: "アメリカーナ",
    termPt: "Americana",
    definition: "A shoulder lock applied by rotating the arm in the opposite direction of a Kimura.",
    definitionJa: "キムラとは逆方向に腕を回して極める肩関節技。",
    definitionPt: "Uma chave de ombro aplicada girando o braço na direção oposta à Kimura.",
    category: "submission"
  },
  {
    term: "Triangle Choke",
    termJa: "三角絞め",
    termPt: "Triângulo",
    definition: "A chokehold that encircles the opponent's neck and one arm with the legs in a figure-four.",
    definitionJa: "足を四の字に組んで相手の首と片腕を囲む絞め技。",
    definitionPt: "Um estrangulamento que envolve o pescoço e um braço do oponente com as pernas em forma de triângulo.",
    category: "submission"
  },
  {
    term: "Rear Naked Choke",
    termJa: "裸絞め",
    termPt: "Mata Leão",
    definition: "A blood choke applied from behind using the arms around the opponent's neck.",
    definitionJa: "背後から腕を相手の首に巻いて極める血管絞め。",
    definitionPt: "Um estrangulamento de sangue aplicado por trás usando os braços ao redor do pescoço do oponente.",
    category: "submission"
  },
  {
    term: "Guillotine",
    termJa: "ギロチン",
    termPt: "Guilhotina",
    definition: "A front headlock choke that can be applied standing or from guard.",
    definitionJa: "立った状態またはガードから極めることができるフロントヘッドロックの絞め技。",
    definitionPt: "Um estrangulamento de gravata frontal que pode ser aplicado em pé ou da guarda.",
    category: "submission"
  },
  {
    term: "Sweep",
    termJa: "スイープ",
    termPt: "Raspagem",
    definition: "A technique to reverse positions from bottom to top.",
    definitionJa: "下からトップにポジションを逆転させる技術。",
    definitionPt: "Uma técnica para reverter posições de baixo para cima.",
    category: "technique"
  },
  {
    term: "Pass",
    termJa: "パス",
    termPt: "Passagem",
    definition: "Moving past your opponent's guard to achieve a dominant position.",
    definitionJa: "相手のガードを通過して支配的なポジションを取ること。",
    definitionPt: "Passar pela guarda do oponente para alcançar uma posição dominante.",
    category: "technique"
  },
  {
    term: "Escape",
    termJa: "エスケープ",
    termPt: "Fuga",
    definition: "Techniques used to get out of a bad position.",
    definitionJa: "悪いポジションから脱出するための技術。",
    definitionPt: "Técnicas usadas para sair de uma posição ruim.",
    category: "technique"
  },
  {
    term: "Shrimp",
    termJa: "エビ",
    termPt: "Fuga de Quadril",
    definition: "A hip escape movement used to create space.",
    definitionJa: "スペースを作るために使用する腰の動き。",
    definitionPt: "Um movimento de escape de quadril usado para criar espaço.",
    category: "movement"
  },
  {
    term: "Bridge",
    termJa: "ブリッジ",
    termPt: "Ponte",
    definition: "A movement where you push your hips up off the ground.",
    definitionJa: "腰を地面から押し上げる動き。",
    definitionPt: "Um movimento onde você empurra os quadris para cima do chão.",
    category: "movement"
  },
  {
    term: "Gi",
    termJa: "道着",
    termPt: "Kimono",
    definition: "The traditional uniform worn in Jiu-Jitsu training.",
    definitionJa: "柔術のトレーニングで着用する伝統的なユニフォーム。",
    definitionPt: "O uniforme tradicional usado no treinamento de Jiu-Jitsu.",
    category: "equipment"
  },
  {
    term: "No-Gi",
    termJa: "ノーギ",
    termPt: "Sem Kimono",
    definition: "Grappling without the traditional uniform, typically in shorts and a rash guard.",
    definitionJa: "道着なしでのグラップリング。通常はショーツとラッシュガードを着用。",
    definitionPt: "Luta sem o uniforme tradicional, geralmente de shorts e rash guard.",
    category: "equipment"
  },
  {
    term: "Tap",
    termJa: "タップ",
    termPt: "Desistência",
    definition: "Signaling submission by tapping your opponent, yourself, or the mat.",
    definitionJa: "相手、自分、またはマットを叩いて降参を示すこと。",
    definitionPt: "Sinalizar desistência batendo no oponente, em si mesmo ou no tatame.",
    category: "general"
  },
  {
    term: "Roll",
    termJa: "スパーリング",
    termPt: "Rolar",
    definition: "A sparring session in Jiu-Jitsu.",
    definitionJa: "柔術でのスパーリングセッション。",
    definitionPt: "Uma sessão de treino livre no Jiu-Jitsu.",
    category: "general"
  },
  {
    term: "Oss",
    termJa: "オス",
    termPt: "Oss",
    definition: "A common greeting and expression of respect in Jiu-Jitsu.",
    definitionJa: "柔術で一般的に使われる挨拶と敬意の表現。",
    definitionPt: "Uma saudação comum e expressão de respeito no Jiu-Jitsu.",
    category: "general"
  },
  {
    term: "Posture",
    termJa: "ポスチャー",
    termPt: "Postura",
    definition: "Your body alignment and positioning, crucial for both offense and defense.",
    definitionJa: "体の配置とポジショニング。攻撃と防御の両方に重要。",
    definitionPt: "Seu alinhamento e posicionamento corporal, crucial para ataque e defesa.",
    category: "concept"
  },
  {
    term: "Base",
    termJa: "ベース",
    termPt: "Base",
    definition: "Your stability and balance, the foundation of all positions.",
    definitionJa: "安定性とバランス。すべてのポジションの基盤。",
    definitionPt: "Sua estabilidade e equilíbrio, a fundação de todas as posições.",
    category: "concept"
  },
  {
    term: "Pressure",
    termJa: "プレッシャー",
    termPt: "Pressão",
    definition: "Using your body weight effectively to control your opponent.",
    definitionJa: "体重を効果的に使って相手をコントロールすること。",
    definitionPt: "Usar seu peso corporal efetivamente para controlar seu oponente.",
    category: "concept"
  }
];

const categories = [
  { id: "all", labelJa: "すべて", labelEn: "All", labelPt: "Todos" },
  { id: "position", labelJa: "ポジション", labelEn: "Positions", labelPt: "Posições" },
  { id: "submission", labelJa: "極め技", labelEn: "Submissions", labelPt: "Finalizações" },
  { id: "technique", labelJa: "テクニック", labelEn: "Techniques", labelPt: "Técnicas" },
  { id: "movement", labelJa: "動き", labelEn: "Movements", labelPt: "Movimentos" },
  { id: "concept", labelJa: "コンセプト", labelEn: "Concepts", labelPt: "Conceitos" },
  { id: "equipment", labelJa: "道具", labelEn: "Equipment", labelPt: "Equipamento" },
  { id: "general", labelJa: "一般", labelEn: "General", labelPt: "Geral" }
];

const Glossary = () => {
  const { language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const titles = {
      ja: "柔術用語集 | jiuflow",
      en: "BJJ Glossary | jiuflow",
      pt: "Glossário de Jiu-Jitsu | jiuflow"
    };
    document.title = titles[language] || titles.ja;
  }, [language]);

  const filteredTerms = useMemo(() => {
    return glossaryTerms.filter(term => {
      const matchesCategory = selectedCategory === "all" || term.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === "" ||
        term.term.toLowerCase().includes(searchLower) ||
        term.termJa.includes(searchQuery) ||
        term.termPt.toLowerCase().includes(searchLower) ||
        term.definition.toLowerCase().includes(searchLower) ||
        term.definitionJa.includes(searchQuery) ||
        term.definitionPt.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const getTermDisplay = (term: GlossaryTerm) => {
    switch (language) {
      case 'ja': return term.termJa;
      case 'pt': return term.termPt;
      default: return term.term;
    }
  };

  const getDefinitionDisplay = (term: GlossaryTerm) => {
    switch (language) {
      case 'ja': return term.definitionJa;
      case 'pt': return term.definitionPt;
      default: return term.definition;
    }
  };

  const getCategoryLabel = (cat: typeof categories[0]) => {
    switch (language) {
      case 'ja': return cat.labelJa;
      case 'pt': return cat.labelPt;
      default: return cat.labelEn;
    }
  };

  const pageTitle = language === 'ja' ? '柔術用語集' : language === 'pt' ? 'Glossário de Jiu-Jitsu' : 'BJJ Glossary';
  const pageSubtitle = language === 'ja' ? '初心者から上級者まで使える柔術用語辞典' : language === 'pt' ? 'Dicionário de termos de Jiu-Jitsu para todos os níveis' : 'A Jiu-Jitsu terminology dictionary for all levels';
  const searchPlaceholder = language === 'ja' ? '用語を検索...' : language === 'pt' ? 'Buscar termos...' : 'Search terms...';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-light mb-4">{pageTitle}</h1>
            <p className="text-lg text-muted-foreground">{pageSubtitle}</p>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-12 h-12 text-lg"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map(cat => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {getCategoryLabel(cat)}
              </Badge>
            ))}
          </div>

          {/* Terms List */}
          <div className="space-y-4">
            {filteredTerms.map((term, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-xl font-medium">{getTermDisplay(term)}</h3>
                  <Badge variant="secondary" className="shrink-0">
                    {getCategoryLabel(categories.find(c => c.id === term.category) || categories[0])}
                  </Badge>
                </div>
                {language !== 'en' && (
                  <p className="text-sm text-muted-foreground mb-2">{term.term}</p>
                )}
                <p className="text-muted-foreground">{getDefinitionDisplay(term)}</p>
              </div>
            ))}

            {filteredTerms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {language === 'ja' ? '該当する用語が見つかりませんでした' : language === 'pt' ? 'Nenhum termo encontrado' : 'No terms found'}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Glossary;
