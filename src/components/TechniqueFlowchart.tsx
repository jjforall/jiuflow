import { useState } from "react";
import { ChevronDown, ChevronRight, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface TechniqueNode {
  id: string;
  name: { ja: string; en: string; pt: string };
  isTransition?: boolean;
  children?: TechniqueNode[];
}

// Define positions as reusable building blocks
const closedGuardTechniques: TechniqueNode[] = [
  { id: "armbar-cg", name: { ja: "腕十字", en: "Armbar", pt: "Armlock" } },
  { id: "triangle-cg", name: { ja: "三角絞め", en: "Triangle Choke", pt: "Triângulo" } },
  { id: "omoplata-cg", name: { ja: "オモプラッタ", en: "Omoplata", pt: "Omoplata" } },
  { id: "kimura-cg", name: { ja: "キムラ", en: "Kimura", pt: "Kimura" } },
  { id: "hip-bump-sweep", name: { ja: "ヒップバンプスイープ", en: "Hip Bump Sweep", pt: "Hip Bump Sweep" } },
  { id: "scissor-sweep", name: { ja: "シザースイープ", en: "Scissor Sweep", pt: "Tesoura" } },
];

const halfGuardTechniques: TechniqueNode[] = [
  { id: "sweep-hg", name: { ja: "スイープ", en: "Sweep", pt: "Raspagem" } },
  { id: "underhook-hg", name: { ja: "アンダーフック", en: "Underhook", pt: "Underhook" } },
  { id: "deep-half", name: { ja: "ディープハーフ", en: "Deep Half", pt: "Meia Profunda" } },
  { id: "lockdown", name: { ja: "ロックダウン", en: "Lockdown", pt: "Lockdown" } },
];

const spiderGuardTechniques: TechniqueNode[] = [
  { id: "triangle-spider", name: { ja: "三角絞め", en: "Triangle", pt: "Triângulo" } },
  { id: "omoplata-spider", name: { ja: "オモプラッタ", en: "Omoplata", pt: "Omoplata" } },
  { id: "spider-sweep", name: { ja: "スパイダースイープ", en: "Spider Sweep", pt: "Raspagem Aranha" } },
];

const dlrTechniques: TechniqueNode[] = [
  { id: "berimbolo", name: { ja: "ベリンボロ", en: "Berimbolo", pt: "Berimbolo" } },
  { id: "dlr-sweep", name: { ja: "DLRスイープ", en: "DLR Sweep", pt: "Raspagem DLR" } },
  { id: "back-take-dlr", name: { ja: "バックテイク", en: "Back Take", pt: "Pegada de Costas" } },
];

const lassoTechniques: TechniqueNode[] = [
  { id: "omoplata-lasso", name: { ja: "オモプラッタ", en: "Omoplata", pt: "Omoplata" } },
  { id: "triangle-lasso", name: { ja: "三角絞め", en: "Triangle", pt: "Triângulo" } },
  { id: "lasso-sweep", name: { ja: "ラッソースイープ", en: "Lasso Sweep", pt: "Raspagem Laço" } },
];

const xGuardTechniques: TechniqueNode[] = [
  { id: "x-sweep", name: { ja: "Xスイープ", en: "X Sweep", pt: "Raspagem X" } },
  { id: "slx", name: { ja: "シングルレッグX", en: "Single Leg X", pt: "X de Uma Perna" } },
  { id: "tech-standup", name: { ja: "テクニカルスタンドアップ", en: "Technical Stand-up", pt: "Levantada Técnica" } },
];

const mountTechniques: TechniqueNode[] = [
  { id: "armbar-mount", name: { ja: "腕十字", en: "Armbar", pt: "Armlock" } },
  { id: "cross-collar", name: { ja: "十字絞め", en: "Cross Collar Choke", pt: "Estrangulamento Cruzado" } },
  { id: "ezekiel", name: { ja: "エゼキエル", en: "Ezekiel Choke", pt: "Ezequiel" } },
  { id: "americana-mount", name: { ja: "アメリカーナ", en: "Americana", pt: "Americana" } },
];

const backControlTechniques: TechniqueNode[] = [
  { id: "rnc", name: { ja: "リアネイキッドチョーク", en: "Rear Naked Choke", pt: "Mata Leão" } },
  { id: "bow-arrow", name: { ja: "ボウ＆アロー", en: "Bow and Arrow", pt: "Arco e Flecha" } },
  { id: "armbar-back", name: { ja: "腕十字", en: "Armbar", pt: "Armlock" } },
];

const sideControlTechniques: TechniqueNode[] = [
  { id: "americana", name: { ja: "アメリカーナ", en: "Americana", pt: "Americana" } },
  { id: "kimura-sc", name: { ja: "キムラ", en: "Kimura", pt: "Kimura" } },
  { id: "arm-triangle", name: { ja: "アームトライアングル", en: "Arm Triangle", pt: "Kata Gatame" } },
];

// Guard Pass Techniques
const closedGuardPassTechniques: TechniqueNode[] = [
  { id: "standing-pass", name: { ja: "スタンディングパス", en: "Standing Pass", pt: "Passagem em Pé" } },
  { id: "knee-slice-cg", name: { ja: "ニースライス", en: "Knee Slice", pt: "Passagem de Joelho" } },
  { id: "double-under", name: { ja: "ダブルアンダー", en: "Double Under", pt: "Passagem por Baixo" } },
  { id: "sao-paulo-pass", name: { ja: "サンパウロパス", en: "Sao Paulo Pass", pt: "Passagem São Paulo" } },
];

const openGuardPassTechniques: TechniqueNode[] = [
  { id: "torreando", name: { ja: "トレアンド", en: "Toreando", pt: "Toreando" } },
  { id: "leg-drag", name: { ja: "レッグドラッグ", en: "Leg Drag", pt: "Leg Drag" } },
  { id: "knee-slice-og", name: { ja: "ニースライス", en: "Knee Slice", pt: "Passagem de Joelho" } },
  { id: "x-pass", name: { ja: "Xパス", en: "X Pass", pt: "X Pass" } },
  { id: "stack-pass", name: { ja: "スタックパス", en: "Stack Pass", pt: "Passagem Empilhada" } },
];

const halfGuardPassTechniques: TechniqueNode[] = [
  { id: "knee-slide", name: { ja: "ニースライド", en: "Knee Slide", pt: "Deslize de Joelho" } },
  { id: "hip-switch", name: { ja: "ヒップスイッチ", en: "Hip Switch", pt: "Troca de Quadril" } },
  { id: "backstep", name: { ja: "バックステップ", en: "Backstep", pt: "Passo Atrás" } },
  { id: "smash-pass", name: { ja: "スマッシュパス", en: "Smash Pass", pt: "Passagem Esmagada" } },
];

const dlrPassTechniques: TechniqueNode[] = [
  { id: "knee-cut-dlr", name: { ja: "ニーカット", en: "Knee Cut", pt: "Corte de Joelho" } },
  { id: "leg-weave", name: { ja: "レッグウィーブ", en: "Leg Weave", pt: "Entrelaçamento" } },
  { id: "dlr-smash", name: { ja: "DLRスマッシュ", en: "DLR Smash", pt: "Esmagar DLR" } },
];

const spiderPassTechniques: TechniqueNode[] = [
  { id: "grip-break", name: { ja: "グリップブレイク", en: "Grip Break", pt: "Quebra de Pegada" } },
  { id: "bull-fighter", name: { ja: "ブルファイター", en: "Bull Fighter", pt: "Toureiro" } },
  { id: "spider-stack", name: { ja: "スタックパス", en: "Stack Pass", pt: "Passagem Empilhada" } },
];

const techniqueTree: TechniqueNode[] = [
  {
    id: "pull",
    name: { ja: "引き込み", en: "Guard Pull", pt: "Puxada de Guarda" },
    children: [
      {
        id: "closed-guard",
        name: { ja: "クローズドガード", en: "Closed Guard", pt: "Guarda Fechada" },
        children: [
          ...closedGuardTechniques,
          {
            id: "cg-transitions",
            name: { ja: "→ ポジション移行", en: "→ Position Transitions", pt: "→ Transições" },
            isTransition: true,
            children: [
              { 
                id: "cg-to-open", 
                name: { ja: "→ オープンガードへ", en: "→ Open Guard", pt: "→ Guarda Aberta" },
                isTransition: true,
                children: [
                  { id: "og-spider-from-cg", name: { ja: "スパイダーガード", en: "Spider Guard", pt: "Guarda Aranha" }, children: spiderGuardTechniques },
                  { id: "og-dlr-from-cg", name: { ja: "デラヒーバ", en: "De La Riva", pt: "De La Riva" }, children: dlrTechniques },
                  { id: "og-lasso-from-cg", name: { ja: "ラッソーガード", en: "Lasso Guard", pt: "Guarda Laço" }, children: lassoTechniques },
                ],
              },
              { 
                id: "cg-to-half", 
                name: { ja: "→ ハーフガードへ", en: "→ Half Guard", pt: "→ Meia Guarda" },
                isTransition: true,
                children: halfGuardTechniques,
              },
              { 
                id: "cg-to-mount", 
                name: { ja: "→ マウント（スイープ成功時）", en: "→ Mount (on sweep)", pt: "→ Montada" },
                isTransition: true,
                children: mountTechniques,
              },
            ],
          },
        ],
      },
      {
        id: "open-guard",
        name: { ja: "オープンガード", en: "Open Guard", pt: "Guarda Aberta" },
        children: [
          {
            id: "spider-guard",
            name: { ja: "スパイダーガード", en: "Spider Guard", pt: "Guarda Aranha" },
            children: spiderGuardTechniques,
          },
          {
            id: "de-la-riva",
            name: { ja: "デラヒーバ", en: "De La Riva", pt: "De La Riva" },
            children: dlrTechniques,
          },
          {
            id: "lasso-guard",
            name: { ja: "ラッソーガード", en: "Lasso Guard", pt: "Guarda Laço" },
            children: lassoTechniques,
          },
          {
            id: "og-transitions",
            name: { ja: "→ ポジション移行", en: "→ Position Transitions", pt: "→ Transições" },
            isTransition: true,
            children: [
              { 
                id: "og-to-closed", 
                name: { ja: "→ クローズドガードへ", en: "→ Closed Guard", pt: "→ Guarda Fechada" },
                isTransition: true,
                children: closedGuardTechniques,
              },
              { 
                id: "og-to-half", 
                name: { ja: "→ ハーフガードへ", en: "→ Half Guard", pt: "→ Meia Guarda" },
                isTransition: true,
                children: halfGuardTechniques,
              },
              { 
                id: "og-to-xguard", 
                name: { ja: "→ Xガードへ", en: "→ X Guard", pt: "→ Guarda X" },
                isTransition: true,
                children: xGuardTechniques,
              },
            ],
          },
        ],
      },
      {
        id: "half-guard",
        name: { ja: "ハーフガード", en: "Half Guard", pt: "Meia Guarda" },
        children: [
          ...halfGuardTechniques,
          {
            id: "hg-transitions",
            name: { ja: "→ ポジション移行", en: "→ Position Transitions", pt: "→ Transições" },
            isTransition: true,
            children: [
              { 
                id: "hg-to-closed", 
                name: { ja: "→ クローズドガードへ", en: "→ Closed Guard", pt: "→ Guarda Fechada" },
                isTransition: true,
                children: closedGuardTechniques,
              },
              { 
                id: "hg-to-open", 
                name: { ja: "→ オープンガードへ", en: "→ Open Guard", pt: "→ Guarda Aberta" },
                isTransition: true,
                children: [
                  { id: "og-spider-from-hg", name: { ja: "スパイダーガード", en: "Spider Guard", pt: "Guarda Aranha" }, children: spiderGuardTechniques },
                  { id: "og-dlr-from-hg", name: { ja: "デラヒーバ", en: "De La Riva", pt: "De La Riva" }, children: dlrTechniques },
                ],
              },
              { 
                id: "hg-to-back", 
                name: { ja: "→ バックテイク", en: "→ Back Take", pt: "→ Pegada de Costas" },
                isTransition: true,
                children: backControlTechniques,
              },
              { 
                id: "hg-to-mount", 
                name: { ja: "→ マウント（スイープ成功時）", en: "→ Mount (on sweep)", pt: "→ Montada" },
                isTransition: true,
                children: mountTechniques,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "takedown",
    name: { ja: "テイクダウン", en: "Takedown", pt: "Takedown" },
    children: [
      {
        id: "single-leg",
        name: { ja: "シングルレッグ", en: "Single Leg", pt: "Single Leg" },
        children: [
          { id: "running-pipe", name: { ja: "ランニングパイプ", en: "Running the Pipe", pt: "Running the Pipe" } },
          { id: "high-crotch", name: { ja: "ハイクロッチ", en: "High Crotch", pt: "High Crotch" } },
          { id: "inside-trip", name: { ja: "インサイドトリップ", en: "Inside Trip", pt: "Inside Trip" } },
        ],
      },
      {
        id: "double-leg",
        name: { ja: "ダブルレッグ", en: "Double Leg", pt: "Double Leg" },
        children: [
          { id: "blast-double", name: { ja: "ブラストダブル", en: "Blast Double", pt: "Blast Double" } },
          { id: "low-single", name: { ja: "ローシングル", en: "Low Single", pt: "Low Single" } },
        ],
      },
      {
        id: "trips",
        name: { ja: "足払い系", en: "Trips", pt: "Rasteiras" },
        children: [
          { id: "osoto-gari", name: { ja: "大外刈り", en: "Osoto Gari", pt: "Osoto Gari" } },
          { id: "kouchi-gari", name: { ja: "小内刈り", en: "Kouchi Gari", pt: "Kouchi Gari" } },
          { id: "ouchi-gari", name: { ja: "大内刈り", en: "Ouchi Gari", pt: "Ouchi Gari" } },
        ],
      },
      {
        id: "td-transitions",
        name: { ja: "→ トップコントロールへ", en: "→ Top Control", pt: "→ Controle de Cima" },
        isTransition: true,
        children: [
          {
            id: "side-control",
            name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" },
            children: [
              ...sideControlTechniques,
              { 
                id: "sc-to-mount", 
                name: { ja: "→ マウントへ", en: "→ Mount", pt: "→ Montada" },
                isTransition: true,
                children: mountTechniques,
              },
              { 
                id: "sc-to-back", 
                name: { ja: "→ バックへ", en: "→ Back", pt: "→ Costas" },
                isTransition: true,
                children: backControlTechniques,
              },
            ],
          },
          {
            id: "mount",
            name: { ja: "マウント", en: "Mount", pt: "Montada" },
            children: [
              ...mountTechniques,
              { 
                id: "mount-to-back", 
                name: { ja: "→ バックへ", en: "→ Back", pt: "→ Costas" },
                isTransition: true,
                children: backControlTechniques,
              },
            ],
          },
          {
            id: "back-control",
            name: { ja: "バックコントロール", en: "Back Control", pt: "Controle de Costas" },
            children: backControlTechniques,
          },
        ],
      },
    ],
  },
  {
    id: "guard-pass",
    name: { ja: "ガードパス", en: "Guard Pass", pt: "Passagem de Guarda" },
    children: [
      {
        id: "pass-closed-guard",
        name: { ja: "クローズドガードパス", en: "Closed Guard Pass", pt: "Passagem de Guarda Fechada" },
        children: [
          ...closedGuardPassTechniques,
          {
            id: "cg-pass-result",
            name: { ja: "→ パス成功後", en: "→ After Pass", pt: "→ Após Passar" },
            isTransition: true,
            children: [
              { id: "cg-pass-to-side", name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" }, children: sideControlTechniques },
              { id: "cg-pass-to-mount", name: { ja: "マウント", en: "Mount", pt: "Montada" }, children: mountTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-open-guard",
        name: { ja: "オープンガードパス", en: "Open Guard Pass", pt: "Passagem de Guarda Aberta" },
        children: [
          ...openGuardPassTechniques,
          {
            id: "og-pass-result",
            name: { ja: "→ パス成功後", en: "→ After Pass", pt: "→ Após Passar" },
            isTransition: true,
            children: [
              { id: "og-pass-to-side", name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" }, children: sideControlTechniques },
              { id: "og-pass-to-mount", name: { ja: "マウント", en: "Mount", pt: "Montada" }, children: mountTechniques },
              { id: "og-pass-to-back", name: { ja: "バック（レッグドラッグから）", en: "Back (from Leg Drag)", pt: "Costas" }, children: backControlTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-half-guard",
        name: { ja: "ハーフガードパス", en: "Half Guard Pass", pt: "Passagem de Meia Guarda" },
        children: [
          ...halfGuardPassTechniques,
          {
            id: "hg-pass-result",
            name: { ja: "→ パス成功後", en: "→ After Pass", pt: "→ Após Passar" },
            isTransition: true,
            children: [
              { id: "hg-pass-to-side", name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" }, children: sideControlTechniques },
              { id: "hg-pass-to-mount", name: { ja: "マウント", en: "Mount", pt: "Montada" }, children: mountTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-dlr",
        name: { ja: "デラヒーバパス", en: "De La Riva Pass", pt: "Passagem de DLR" },
        children: [
          ...dlrPassTechniques,
          {
            id: "dlr-pass-result",
            name: { ja: "→ パス成功後", en: "→ After Pass", pt: "→ Após Passar" },
            isTransition: true,
            children: [
              { id: "dlr-pass-to-side", name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" }, children: sideControlTechniques },
              { id: "dlr-pass-to-back", name: { ja: "バック", en: "Back", pt: "Costas" }, children: backControlTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-spider",
        name: { ja: "スパイダーガードパス", en: "Spider Guard Pass", pt: "Passagem de Guarda Aranha" },
        children: [
          ...spiderPassTechniques,
          {
            id: "spider-pass-result",
            name: { ja: "→ パス成功後", en: "→ After Pass", pt: "→ Após Passar" },
            isTransition: true,
            children: [
              { id: "spider-pass-to-side", name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" }, children: sideControlTechniques },
            ],
          },
        ],
      },
    ],
  },
];

const CollapsibleNode = ({ 
  node, 
  depth = 0,
  language 
}: { 
  node: TechniqueNode; 
  depth?: number;
  language: string;
}) => {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  const getName = () => {
    if (language === "ja") return node.name.ja;
    if (language === "pt") return node.name.pt;
    return node.name.en;
  };

  const getBgColor = () => {
    if (node.isTransition) return "bg-accent/20 border-accent/40 hover:bg-accent/30";
    if (depth === 0) return "bg-primary/10 border-primary/30 hover:bg-primary/20";
    if (depth === 1) return "bg-secondary/50 border-border hover:bg-secondary/70";
    if (depth === 2) return "bg-muted/50 border-border/50 hover:bg-muted/70";
    return "bg-card/50 border-border/30 hover:bg-card/70";
  };

  return (
    <div className={cn("ml-0", depth > 0 && "ml-4 md:ml-6")}>
      <button
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        disabled={!hasChildren}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left",
          getBgColor(),
          hasChildren && "cursor-pointer",
          !hasChildren && "cursor-default opacity-80"
        )}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0 text-primary" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          )
        ) : (
          <Circle className="w-2 h-2 flex-shrink-0 text-muted-foreground fill-current" />
        )}
        {node.isTransition && <ArrowRight className="w-3 h-3 flex-shrink-0 text-accent-foreground" />}
        <span className={cn(
          "text-sm md:text-base",
          depth === 0 && "font-semibold text-primary",
          depth === 1 && "font-medium",
          node.isTransition && "text-accent-foreground italic",
          depth > 1 && !node.isTransition && "text-muted-foreground"
        )}>
          {getName()}
        </span>
        {hasChildren && (
          <span className="ml-auto text-xs text-muted-foreground">
            {node.children?.length}
          </span>
        )}
      </button>

      {hasChildren && isOpen && (
        <div className={cn(
          "mt-1 space-y-1 ml-2 pl-2",
          node.isTransition ? "border-l-2 border-accent/30" : "border-l-2 border-primary/20"
        )}>
          {node.children?.map((child) => (
            <CollapsibleNode
              key={child.id}
              node={child}
              depth={depth + 1}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TechniqueFlowchart = () => {
  const { language } = useLanguage();

  const titles = {
    ja: "技のフローチャート",
    en: "Technique Flowchart",
    pt: "Fluxograma de Técnicas",
  };

  const descriptions = {
    ja: "柔術の技は「引き込み」「テイクダウン」「ガードパス」に分岐します。各項目をクリックして展開し、ポジション移行から次の技を選べます。",
    en: "BJJ techniques branch into 'Guard Pull', 'Takedown', and 'Guard Pass'. Click to expand and explore transitions.",
    pt: "As técnicas de BJJ se dividem em 'Puxada', 'Takedown' e 'Passagem'. Clique para expandir e explorar.",
  };

  return (
    <section className="py-16 max-w-5xl mx-auto">
      <h2 className="text-4xl font-light mb-4 text-center">
        {titles[language as keyof typeof titles] || titles.ja}
      </h2>
      <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
        {descriptions[language as keyof typeof descriptions] || descriptions.ja}
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techniqueTree.map((node) => (
          <div key={node.id} className="space-y-2">
            <CollapsibleNode node={node} language={language} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default TechniqueFlowchart;
