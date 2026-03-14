import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Lang = "ja" | "en" | "pt";

const t = (ja: string, en: string, pt?: string) => ({ ja, en, pt: pt || en });

// ============================================================
// Data Types
// ============================================================

interface FlowNode {
  id: string;
  label: { ja: string; en: string; pt: string };
  type: "start" | "decision" | "action" | "transition" | "finish";
  children?: FlowNode[];
}

// ============================================================
// 1. クローズドガード展開 (Closed Guard)
// ============================================================

const closedGuardFlow: FlowNode = {
  id: "cg",
  label: t("クローズドガード", "Closed Guard", "Guarda Fechada"),
  type: "start",
  children: [
    {
      id: "cg-combat",
      label: t("相手がコンバットベース", "Opponent in Combat Base", "Oponente em Combat Base"),
      type: "decision",
      children: [
        { id: "cg-cross-grip", label: t("クロスグリップ → テラバンダ", "Cross Grip → Terra Banda", "Cross Grip → Terra Banda"), type: "action" },
        { id: "cg-roll-guard", label: t("ヒカを取りつつ転がる → コントロール", "Roll taking hika → Control", "Rolar pegando hika → Controle"), type: "finish" },
      ],
    },
    {
      id: "cg-pass-defense",
      label: t("パスを防ぐ", "Prevent Pass", "Prevenir Passagem"),
      type: "decision",
      children: [
        { id: "cg-repull", label: t("引き込みし直し", "Re-pull Guard", "Puxar guarda novamente"), type: "action" },
        { id: "cg-standup", label: t("立ちこみ → スタンド", "Stand Up → Reset", "Levantar → Reset"), type: "action" },
      ],
    },
    {
      id: "cg-shrimp",
      label: t("片えびフレーム → オープンガード展開", "Shrimp Frame → Open Guard", "Frame Camarão → Guarda Aberta"),
      type: "decision",
      children: [
        {
          id: "cg-dlr",
          label: t("デラヒーバ", "De La Riva", "De La Riva"),
          type: "action",
          children: [
            { id: "dlr-sweep", label: t("DLRスイープ", "DLR Sweep", "Raspagem DLR"), type: "finish" },
            { id: "dlr-bolo", label: t("ベリンボロ", "Berimbolo", "Berimbolo"), type: "finish" },
            { id: "dlr-back", label: t("バックテイク", "Back Take", "Pegada de Costas"), type: "finish" },
          ],
        },
        {
          id: "cg-spider",
          label: t("スパイダーガード", "Spider Guard", "Guarda Aranha"),
          type: "action",
          children: [
            { id: "sp-tri", label: t("三角絞め", "Triangle", "Triângulo"), type: "finish" },
            { id: "sp-omo", label: t("オモプラッタ", "Omoplata", "Omoplata"), type: "finish" },
            { id: "sp-sweep", label: t("スイープ", "Sweep", "Raspagem"), type: "finish" },
          ],
        },
        {
          id: "cg-lasso",
          label: t("ラッソーガード", "Lasso Guard", "Guarda Laço"),
          type: "action",
          children: [
            { id: "la-omo", label: t("オモプラッタ", "Omoplata", "Omoplata"), type: "finish" },
            { id: "la-sweep", label: t("ラッソースイープ", "Lasso Sweep", "Raspagem Laço"), type: "finish" },
            { id: "la-tri", label: t("三角絞め", "Triangle", "Triângulo"), type: "finish" },
          ],
        },
      ],
    },
    {
      id: "cg-single-dlr",
      label: t("片足デラヒーバルート", "Single Leg DLR Route", "Rota DLR uma perna"),
      type: "decision",
      children: [
        { id: "sdlr-x", label: t("→ Xガード", "→ X Guard", "→ Guarda X"), type: "transition" },
        { id: "sdlr-slx", label: t("→ シングルレッグX", "→ Single Leg X", "→ X Uma Perna"), type: "transition" },
      ],
    },
    {
      id: "cg-compact",
      label: t("左腕翼 → コンパクトガード", "Left Arm Wing → Compact Guard", "Asa Braço Esq → Guarda Compacta"),
      type: "decision",
      children: [
        { id: "compact-ctrl", label: t("引き付けて右手を抜く", "Pull in, extract right hand", "Puxar, extrair mão direita"), type: "action" },
      ],
    },
    {
      id: "cg-subs",
      label: t("キープ → サブミッション", "Keep → Submissions", "Manter → Finalizações"),
      type: "decision",
      children: [
        { id: "sub-arm", label: t("腕十字", "Armbar", "Armlock"), type: "finish" },
        { id: "sub-tri", label: t("三角絞め", "Triangle", "Triângulo"), type: "finish" },
        { id: "sub-omo", label: t("オモプラッタ", "Omoplata", "Omoplata"), type: "finish" },
        { id: "sub-kim", label: t("キムラ", "Kimura", "Kimura"), type: "finish" },
        { id: "sub-hip", label: t("ヒップバンプ → マウント", "Hip Bump → Mount", "Hip Bump → Montada"), type: "finish" },
        { id: "sub-sci", label: t("シザースイープ → マウント", "Scissor Sweep → Mount", "Tesoura → Montada"), type: "finish" },
      ],
    },
  ],
};

// ============================================================
// 2. ハーフガードリカバリー (Half Guard Recovery)
// ============================================================

const halfGuardFlow: FlowNode = {
  id: "hg",
  label: t("ハーフガードリカバリー", "Half Guard Recovery", "Recuperação Meia Guarda"),
  type: "start",
  children: [
    {
      id: "hg1",
      label: t("① 相手が上体についてくる", "① Opponent follows with upper body", "① Oponente segue com tronco"),
      type: "decision",
      children: [
        { id: "hg1-under", label: t("アンダーフック → 足かけ → クローズドへ", "Underhook → Hook → Closed Guard", "Underhook → Gancho → Guarda Fechada"), type: "action" },
        { id: "hg1-extract", label: t("内側から足抜き", "Extract leg from inside", "Extrair perna por dentro"), type: "action" },
      ],
    },
    {
      id: "hg2",
      label: t("② 腰を押してスペース作る", "② Push hip to create space", "② Empurrar quadril para espaço"),
      type: "decision",
      children: [
        {
          id: "hg2-tech",
          label: t("テクニカルスタンドアップ", "Technical Stand-up", "Levantada Técnica"),
          type: "action",
          children: [
            { id: "hg2-reset", label: t("ポジション確認 → 建て直す", "Confirm position → Reset", "Confirmar → Reiniciar"), type: "finish" },
          ],
        },
      ],
    },
    {
      id: "hg3",
      label: t("③ フレームでガードリカバリ", "③ Frame for guard recovery", "③ Frame para recuperar guarda"),
      type: "decision",
      children: [
        {
          id: "hg3-frame",
          label: t("チョイフレーム → 反力で足を回す", "Choi Frame → Swing leg with reaction", "Frame → Girar perna com reação"),
          type: "action",
          children: [
            { id: "hg3-insert", label: t("相手の股に足を入れる → ガードリカバリ", "Insert leg → Guard recovery", "Inserir perna → Recuperação"), type: "finish" },
          ],
        },
      ],
    },
    {
      id: "hg-pass-def",
      label: t("パスされそうな時", "When about to get passed", "Prestes a ter guarda passada"),
      type: "decision",
      children: [
        { id: "hg-crossface", label: t("枕を防ぐ → 胸元を近づけてスペース作る", "Prevent crossface → Close distance", "Prevenir crossface → Fechar distância"), type: "action" },
        { id: "hg-seiza", label: t("正座からリカバリ → 確認 → スペース作る", "Kneeling recovery → Assess → Create space", "Recuperação ajoelhado → Avaliar → Criar espaço"), type: "action" },
        { id: "hg-applied", label: t("技かけられた → リカバリポジションへ → スペース作る", "Technique applied → Recovery position → Space", "Técnica aplicada → Posição de recuperação → Espaço"), type: "action" },
      ],
    },
  ],
};

// ============================================================
// 3. ガードパス (Guard Pass)
// ============================================================

const guardPassFlow: FlowNode = {
  id: "gp",
  label: t("ガードパス", "Guard Pass", "Passagem de Guarda"),
  type: "start",
  children: [
    {
      id: "gp-closed",
      label: t("クローズドガードパス", "Closed Guard Pass", "Passagem Guarda Fechada"),
      type: "decision",
      children: [
        { id: "gp-stand", label: t("スタンディングパス", "Standing Pass", "Passagem em Pé"), type: "action" },
        { id: "gp-knee", label: t("ニースライス", "Knee Slice", "Passagem de Joelho"), type: "action" },
        { id: "gp-double", label: t("ダブルアンダー", "Double Under", "Passagem por Baixo"), type: "action" },
        { id: "gp-sao", label: t("サンパウロパス", "São Paulo Pass", "Passagem São Paulo"), type: "action" },
      ],
    },
    {
      id: "gp-half",
      label: t("ハーフガードパス", "Half Guard Pass", "Passagem Meia Guarda"),
      type: "decision",
      children: [
        { id: "gp-slide", label: t("ニースライド", "Knee Slide", "Deslize de Joelho"), type: "action" },
        { id: "gp-hip", label: t("ヒップスイッチ", "Hip Switch", "Troca de Quadril"), type: "action" },
        { id: "gp-back", label: t("バックステップ", "Backstep", "Passo Atrás"), type: "action" },
        { id: "gp-smash", label: t("スマッシュパス", "Smash Pass", "Passagem Esmagada"), type: "action" },
      ],
    },
    {
      id: "gp-open",
      label: t("オープンガードパス", "Open Guard Pass", "Passagem Guarda Aberta"),
      type: "decision",
      children: [
        { id: "gp-tor", label: t("トレアンド", "Toreando", "Toreando"), type: "action" },
        { id: "gp-drag", label: t("レッグドラッグ", "Leg Drag", "Leg Drag"), type: "action" },
        { id: "gp-x", label: t("Xパス", "X Pass", "X Pass"), type: "action" },
        { id: "gp-stack", label: t("スタックパス", "Stack Pass", "Passagem Empilhada"), type: "action" },
      ],
    },
    {
      id: "gp-result",
      label: t("→ パス成功後", "→ After Pass", "→ Após Passagem"),
      type: "transition",
      children: [
        { id: "gp-side", label: t("サイドコントロール", "Side Control", "100 Kilos"), type: "finish" },
        { id: "gp-mount", label: t("マウント", "Mount", "Montada"), type: "finish" },
        { id: "gp-back-ctrl", label: t("バック", "Back", "Costas"), type: "finish" },
      ],
    },
  ],
};

// ============================================================
// Styles per node type
// ============================================================

const nodeStyles: Record<FlowNode["type"], { bg: string; border: string; text: string; dot: string }> = {
  start:      { bg: "bg-blue-600",    border: "border-blue-700",   text: "text-white",                      dot: "bg-blue-600" },
  decision:   { bg: "bg-amber-50 dark:bg-amber-950/40",    border: "border-amber-400 dark:border-amber-600", text: "text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  action:     { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-400 dark:border-emerald-600", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
  transition: { bg: "bg-purple-50 dark:bg-purple-950/40",  border: "border-purple-400 dark:border-purple-600", text: "text-purple-800 dark:text-purple-200", dot: "bg-purple-500" },
  finish:     { bg: "bg-red-50 dark:bg-red-950/40",        border: "border-red-400 dark:border-red-600",    text: "text-red-800 dark:text-red-200",     dot: "bg-red-500" },
};

const typeLabels: Record<FlowNode["type"], { ja: string; en: string }> = {
  start:      { ja: "起点", en: "Start" },
  decision:   { ja: "判断", en: "Decision" },
  action:     { ja: "アクション", en: "Action" },
  transition: { ja: "移行", en: "Transition" },
  finish:     { ja: "結果", en: "Result" },
};

// ============================================================
// Visual Flow Chart Node
// ============================================================

const FlowCard = ({
  node,
  lang,
  depth = 0,
}: {
  node: FlowNode;
  lang: Lang;
  depth?: number;
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const style = nodeStyles[node.type];
  const hasKids = node.children && node.children.length > 0;

  // Start node = full-width header
  if (node.type === "start") {
    return (
      <div className="w-full">
        <div
          className={cn(
            "rounded-2xl px-6 py-4 text-center font-bold text-xl md:text-2xl shadow-lg",
            style.bg, style.border, style.text, "border-2"
          )}
        >
          {node.label[lang]}
        </div>

        {/* Vertical connector */}
        {hasKids && (
          <div className="flex justify-center">
            <div className="w-0.5 h-6 bg-border" />
          </div>
        )}

        {/* Children grid */}
        {hasKids && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {node.children!.map((child) => (
              <FlowCard key={child.id} node={child} lang={lang} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch">
      {/* Node card */}
      <button
        onClick={() => hasKids && setExpanded(!expanded)}
        className={cn(
          "rounded-xl px-4 py-3 border-2 text-left transition-all shadow-sm hover:shadow-md w-full",
          style.bg, style.border,
          hasKids && "cursor-pointer"
        )}
      >
        <div className="flex items-start gap-2">
          {/* Type dot */}
          <span className={cn("w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0", style.dot)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm md:text-base font-medium leading-snug", style.text)}>
              {node.label[lang]}
            </p>
          </div>
          {/* Expand indicator */}
          {hasKids && (
            <span className="text-xs text-muted-foreground flex-shrink-0 mt-1">
              {expanded ? "▼" : "▶"} {node.children!.length}
            </span>
          )}
        </div>
      </button>

      {/* Children with connector lines */}
      {hasKids && expanded && (
        <div className="ml-4 mt-1 pl-4 border-l-2 border-dashed border-muted-foreground/30 space-y-1">
          {node.children!.map((child) => (
            <div key={child.id} className="relative">
              {/* Horizontal connector */}
              <div className="absolute -left-4 top-4 w-4 h-0.5 bg-muted-foreground/30" />
              <FlowCard node={child} lang={lang} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Legend
// ============================================================

const Legend = ({ lang }: { lang: Lang }) => (
  <div className="flex flex-wrap gap-3 justify-center mb-8">
    {(Object.keys(nodeStyles) as FlowNode["type"][]).map((type) => (
      <div
        key={type}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
          nodeStyles[type].bg, nodeStyles[type].border, nodeStyles[type].text
        )}
      >
        <span className={cn("w-2 h-2 rounded-full", nodeStyles[type].dot)} />
        {typeLabels[type][lang === "pt" ? "en" : lang]}
      </div>
    ))}
  </div>
);

// ============================================================
// Tab Selector
// ============================================================

const flows = [closedGuardFlow, halfGuardFlow, guardPassFlow];

export const TechniqueFlowchart = () => {
  const { language } = useLanguage();
  const lang = (language === "ja" || language === "en" || language === "pt" ? language : "en") as Lang;
  const [activeTab, setActiveTab] = useState(0);

  const titles = t("実戦テクニックフロー", "Practical Technique Flow", "Fluxo Prático de Técnicas");
  const descs = t(
    "状況ごとの判断フロー。クローズド・ハーフガード・パスの展開を一覧で。",
    "Situational decision flows. Explore closed guard, half guard, and passing trees.",
    "Fluxos de decisão situacional."
  );

  return (
    <section className="py-12 max-w-6xl mx-auto">
      <h2 className="text-4xl font-light mb-3 text-center">{titles[lang]}</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto text-sm">
        {descs[lang]}
      </p>

      <Legend lang={lang} />

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {flows.map((flow, i) => (
          <button
            key={flow.id}
            onClick={() => setActiveTab(i)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-medium transition-all border-2",
              activeTab === i
                ? "bg-blue-600 text-white border-blue-700 shadow-lg"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border"
            )}
          >
            {flow.label[lang]}
          </button>
        ))}
      </div>

      {/* Active Flow Chart */}
      <div className="bg-card/60 backdrop-blur-sm rounded-2xl border p-6 md:p-8 shadow-xl">
        <FlowCard node={flows[activeTab]} lang={lang} />
      </div>

      {/* All flows overview (collapsed summary) */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        {flows.map((flow, i) => {
          if (i === activeTab) return null;
          const childCount = flow.children?.length || 0;
          return (
            <button
              key={flow.id}
              onClick={() => setActiveTab(i)}
              className="group p-6 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={cn("w-3 h-3 rounded-full", nodeStyles.start.dot)} />
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {flow.label[lang]}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === "ja" ? `${childCount}つの分岐` : `${childCount} branches`}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default TechniqueFlowchart;
