import { useState } from "react";
import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface TechniqueNode {
  id: string;
  name: { ja: string; en: string; pt: string };
  children?: TechniqueNode[];
}

const techniqueTree: TechniqueNode[] = [
  {
    id: "pull",
    name: { ja: "引き込み", en: "Guard Pull", pt: "Puxada de Guarda" },
    children: [
      {
        id: "closed-guard",
        name: { ja: "クローズドガード", en: "Closed Guard", pt: "Guarda Fechada" },
        children: [
          { id: "armbar-cg", name: { ja: "腕十字", en: "Armbar", pt: "Armlock" } },
          { id: "triangle-cg", name: { ja: "三角絞め", en: "Triangle Choke", pt: "Triângulo" } },
          { id: "omoplata-cg", name: { ja: "オモプラッタ", en: "Omoplata", pt: "Omoplata" } },
          { id: "kimura-cg", name: { ja: "キムラ", en: "Kimura", pt: "Kimura" } },
          { id: "hip-bump-sweep", name: { ja: "ヒップバンプスイープ", en: "Hip Bump Sweep", pt: "Hip Bump Sweep" } },
          { id: "scissor-sweep", name: { ja: "シザースイープ", en: "Scissor Sweep", pt: "Tesoura" } },
          {
            id: "cg-transitions",
            name: { ja: "→ ポジション移行", en: "→ Position Transitions", pt: "→ Transições" },
            children: [
              { id: "cg-to-open", name: { ja: "→ オープンガードへ", en: "→ Open Guard", pt: "→ Guarda Aberta" } },
              { id: "cg-to-half", name: { ja: "→ ハーフガードへ", en: "→ Half Guard", pt: "→ Meia Guarda" } },
              { id: "cg-to-mount", name: { ja: "→ マウント（スイープ成功時）", en: "→ Mount (on sweep)", pt: "→ Montada" } },
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
            children: [
              { id: "triangle-spider", name: { ja: "三角絞め", en: "Triangle", pt: "Triângulo" } },
              { id: "omoplata-spider", name: { ja: "オモプラッタ", en: "Omoplata", pt: "Omoplata" } },
              { id: "spider-sweep", name: { ja: "スパイダースイープ", en: "Spider Sweep", pt: "Raspagem Aranha" } },
            ],
          },
          {
            id: "de-la-riva",
            name: { ja: "デラヒーバ", en: "De La Riva", pt: "De La Riva" },
            children: [
              { id: "berimbolo", name: { ja: "ベリンボロ", en: "Berimbolo", pt: "Berimbolo" } },
              { id: "dlr-sweep", name: { ja: "DLRスイープ", en: "DLR Sweep", pt: "Raspagem DLR" } },
              { id: "back-take-dlr", name: { ja: "バックテイク", en: "Back Take", pt: "Pegada de Costas" } },
            ],
          },
          {
            id: "lasso-guard",
            name: { ja: "ラッソーガード", en: "Lasso Guard", pt: "Guarda Laço" },
            children: [
              { id: "omoplata-lasso", name: { ja: "オモプラッタ", en: "Omoplata", pt: "Omoplata" } },
              { id: "triangle-lasso", name: { ja: "三角絞め", en: "Triangle", pt: "Triângulo" } },
              { id: "lasso-sweep", name: { ja: "ラッソースイープ", en: "Lasso Sweep", pt: "Raspagem Laço" } },
            ],
          },
          {
            id: "og-transitions",
            name: { ja: "→ ポジション移行", en: "→ Position Transitions", pt: "→ Transições" },
            children: [
              { id: "og-to-closed", name: { ja: "→ クローズドガードへ", en: "→ Closed Guard", pt: "→ Guarda Fechada" } },
              { id: "og-to-half", name: { ja: "→ ハーフガードへ", en: "→ Half Guard", pt: "→ Meia Guarda" } },
              { id: "og-to-xguard", name: { ja: "→ Xガードへ", en: "→ X Guard", pt: "→ Guarda X" } },
            ],
          },
        ],
      },
      {
        id: "half-guard",
        name: { ja: "ハーフガード", en: "Half Guard", pt: "Meia Guarda" },
        children: [
          { id: "sweep-hg", name: { ja: "スイープ", en: "Sweep", pt: "Raspagem" } },
          { id: "underhook-hg", name: { ja: "アンダーフック", en: "Underhook", pt: "Underhook" } },
          { id: "deep-half", name: { ja: "ディープハーフ", en: "Deep Half", pt: "Meia Profunda" } },
          { id: "lockdown", name: { ja: "ロックダウン", en: "Lockdown", pt: "Lockdown" } },
          {
            id: "hg-transitions",
            name: { ja: "→ ポジション移行", en: "→ Position Transitions", pt: "→ Transições" },
            children: [
              { id: "hg-to-closed", name: { ja: "→ クローズドガードへ", en: "→ Closed Guard", pt: "→ Guarda Fechada" } },
              { id: "hg-to-open", name: { ja: "→ オープンガードへ", en: "→ Open Guard", pt: "→ Guarda Aberta" } },
              { id: "hg-to-back", name: { ja: "→ バックテイク", en: "→ Back Take", pt: "→ Pegada de Costas" } },
              { id: "hg-to-mount", name: { ja: "→ マウント（スイープ成功時）", en: "→ Mount (on sweep)", pt: "→ Montada" } },
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
        id: "top-control",
        name: { ja: "トップコントロール", en: "Top Control", pt: "Controle de Cima" },
        children: [
          {
            id: "side-control",
            name: { ja: "サイドコントロール", en: "Side Control", pt: "100 Kilos" },
            children: [
              { id: "americana", name: { ja: "アメリカーナ", en: "Americana", pt: "Americana" } },
              { id: "kimura-sc", name: { ja: "キムラ", en: "Kimura", pt: "Kimura" } },
              { id: "arm-triangle", name: { ja: "アームトライアングル", en: "Arm Triangle", pt: "Kata Gatame" } },
              { id: "mount-trans", name: { ja: "マウントへ移行", en: "Mount Transition", pt: "Passagem para Montada" } },
            ],
          },
          {
            id: "mount",
            name: { ja: "マウント", en: "Mount", pt: "Montada" },
            children: [
              { id: "armbar-mount", name: { ja: "腕十字", en: "Armbar", pt: "Armlock" } },
              { id: "cross-collar", name: { ja: "十字絞め", en: "Cross Collar Choke", pt: "Estrangulamento Cruzado" } },
              { id: "ezekiel", name: { ja: "エゼキエル", en: "Ezekiel Choke", pt: "Ezequiel" } },
              { id: "back-take-mount", name: { ja: "バックテイク", en: "Back Take", pt: "Pegada de Costas" } },
            ],
          },
          {
            id: "back-control",
            name: { ja: "バックコントロール", en: "Back Control", pt: "Controle de Costas" },
            children: [
              { id: "rnc", name: { ja: "リアネイキッドチョーク", en: "Rear Naked Choke", pt: "Mata Leão" } },
              { id: "bow-arrow", name: { ja: "ボウ＆アロー", en: "Bow and Arrow", pt: "Arco e Flecha" } },
              { id: "armbar-back", name: { ja: "腕十字", en: "Armbar", pt: "Armlock" } },
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
        <span className={cn(
          "text-sm md:text-base",
          depth === 0 && "font-semibold text-primary",
          depth === 1 && "font-medium",
          depth > 1 && "text-muted-foreground"
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
        <div className="mt-1 space-y-1 border-l-2 border-primary/20 ml-2 pl-2">
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
    ja: "柔術の技は大きく「引き込み」と「テイクダウン」に分岐します。各項目をクリックして詳細を展開できます。",
    en: "BJJ techniques branch into 'Guard Pull' and 'Takedown'. Click each item to expand details.",
    pt: "As técnicas de BJJ se dividem em 'Puxada de Guarda' e 'Takedown'. Clique em cada item para expandir.",
  };

  return (
    <section className="py-16 max-w-4xl mx-auto">
      <h2 className="text-4xl font-light mb-4 text-center">
        {titles[language as keyof typeof titles] || titles.ja}
      </h2>
      <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
        {descriptions[language as keyof typeof descriptions] || descriptions.ja}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
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
