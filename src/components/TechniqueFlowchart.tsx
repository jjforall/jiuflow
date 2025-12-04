import { useState } from "react";
import { ChevronDown, ChevronRight, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type Language = "ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi";

interface TechniqueNode {
  id: string;
  name: Record<Language, string>;
  isTransition?: boolean;
  children?: TechniqueNode[];
}

// Helper to create multilingual names
const t = (ja: string, en: string, pt: string, es?: string, fr?: string, de?: string, zh?: string, ko?: string, it?: string, ru?: string, ar?: string, hi?: string): Record<Language, string> => ({
  ja,
  en,
  pt,
  es: es || en,
  fr: fr || en,
  de: de || en,
  zh: zh || en,
  ko: ko || en,
  it: it || en,
  ru: ru || en,
  ar: ar || en,
  hi: hi || en,
});

// Define positions as reusable building blocks
const closedGuardTechniques: TechniqueNode[] = [
  { id: "armbar-cg", name: t("腕十字", "Armbar", "Armlock", "Palanca al brazo", "Clé de bras", "Armhebel", "十字固", "암바", "Leva al braccio", "Рычаг локтя", "قفل الذراع", "आर्मबार") },
  { id: "triangle-cg", name: t("三角絞め", "Triangle Choke", "Triângulo", "Triángulo", "Triangle", "Dreieckswürger", "三角绞", "삼각조르기", "Triangolo", "Треугольник", "خنق المثلث", "ट्रायंगल चोक") },
  { id: "omoplata-cg", name: t("オモプラッタ", "Omoplata", "Omoplata", "Omoplata", "Omoplata", "Omoplata", "肩胛骨锁", "오모플라타", "Omoplata", "Омоплата", "أوموبلاتا", "ओमोप्लाटा") },
  { id: "kimura-cg", name: t("キムラ", "Kimura", "Kimura", "Kimura", "Kimura", "Kimura", "木村锁", "기무라", "Kimura", "Кимура", "كيمورا", "किमुरा") },
  { id: "hip-bump-sweep", name: t("ヒップバンプスイープ", "Hip Bump Sweep", "Hip Bump Sweep", "Barrida de cadera", "Balayage hip bump", "Hip Bump Sweep", "顶髋扫", "힙범프스윕", "Spazzata hip bump", "Хип-бамп свип", "مسح ضربة الورك", "हिप बंप स्वीप") },
  { id: "scissor-sweep", name: t("シザースイープ", "Scissor Sweep", "Tesoura", "Tijera", "Ciseaux", "Scherenfeger", "剪刀扫", "시저스윕", "Forbice", "Ножницы", "مسح المقص", "सिज़र स्वीप") },
];

const halfGuardTechniques: TechniqueNode[] = [
  { id: "sweep-hg", name: t("スイープ", "Sweep", "Raspagem", "Barrida", "Balayage", "Sweep", "扫技", "스윕", "Spazzata", "Свип", "مسح", "स्वीप") },
  { id: "underhook-hg", name: t("アンダーフック", "Underhook", "Underhook", "Gancho bajo", "Crochet bas", "Underhook", "下钩", "언더훅", "Underhook", "Андерхук", "خطاف سفلي", "अंडरहुक") },
  { id: "deep-half", name: t("ディープハーフ", "Deep Half", "Meia Profunda", "Media profunda", "Demi-garde profonde", "Tiefe Halbgarde", "深半卫", "딥하프", "Mezza guardia profonda", "Глубокий халф", "نصف عميق", "डीप हाफ") },
  { id: "lockdown", name: t("ロックダウン", "Lockdown", "Lockdown", "Lockdown", "Lockdown", "Lockdown", "锁腿", "락다운", "Lockdown", "Локдаун", "قفل", "लॉकडाउन") },
];

const spiderGuardTechniques: TechniqueNode[] = [
  { id: "triangle-spider", name: t("三角絞め", "Triangle", "Triângulo", "Triángulo", "Triangle", "Dreieck", "三角绞", "삼각", "Triangolo", "Треугольник", "مثلث", "ट्रायंगल") },
  { id: "omoplata-spider", name: t("オモプラッタ", "Omoplata", "Omoplata", "Omoplata", "Omoplata", "Omoplata", "肩胛骨锁", "오모플라타", "Omoplata", "Омоплата", "أوموبلاتا", "ओमोप्लाटा") },
  { id: "spider-sweep", name: t("スパイダースイープ", "Spider Sweep", "Raspagem Aranha", "Barrida araña", "Balayage araignée", "Spinnenfeger", "蜘蛛扫", "스파이더스윕", "Spazzata ragno", "Паук свип", "مسح العنكبوت", "स्पाइडर स्वीप") },
];

const dlrTechniques: TechniqueNode[] = [
  { id: "berimbolo", name: t("ベリンボロ", "Berimbolo", "Berimbolo", "Berimbolo", "Berimbolo", "Berimbolo", "贝林波罗", "베림볼로", "Berimbolo", "Беримболо", "بيرمبولو", "बेरिम्बोलो") },
  { id: "dlr-sweep", name: t("DLRスイープ", "DLR Sweep", "Raspagem DLR", "Barrida DLR", "Balayage DLR", "DLR Sweep", "DLR扫", "DLR스윕", "Spazzata DLR", "ДЛР свип", "مسح DLR", "DLR स्वीप") },
  { id: "back-take-dlr", name: t("バックテイク", "Back Take", "Pegada de Costas", "Toma de espalda", "Prise du dos", "Rücknahme", "背部控制", "백테이크", "Presa schiena", "Взятие спины", "أخذ الظهر", "बैक टेक") },
];

const lassoTechniques: TechniqueNode[] = [
  { id: "omoplata-lasso", name: t("オモプラッタ", "Omoplata", "Omoplata", "Omoplata", "Omoplata", "Omoplata", "肩胛骨锁", "오모플라타", "Omoplata", "Омоплата", "أوموبلاتا", "ओमोप्लाटा") },
  { id: "triangle-lasso", name: t("三角絞め", "Triangle", "Triângulo", "Triángulo", "Triangle", "Dreieck", "三角绞", "삼각", "Triangolo", "Треугольник", "مثلث", "ट्रायंगल") },
  { id: "lasso-sweep", name: t("ラッソースイープ", "Lasso Sweep", "Raspagem Laço", "Barrida lazo", "Balayage lasso", "Lasso Sweep", "套索扫", "라쏘스윕", "Spazzata lasso", "Лассо свип", "مسح اللاسو", "लासो स्वीप") },
];

const xGuardTechniques: TechniqueNode[] = [
  { id: "x-sweep", name: t("Xスイープ", "X Sweep", "Raspagem X", "Barrida X", "Balayage X", "X Sweep", "X扫", "X스윕", "Spazzata X", "Х свип", "مسح X", "X स्वीप") },
  { id: "slx", name: t("シングルレッグX", "Single Leg X", "X de Uma Perna", "X de una pierna", "X une jambe", "Einbein X", "单腿X", "싱글레그X", "X gamba singola", "Одноногий Х", "X ساق واحدة", "सिंगल लेग X") },
  { id: "tech-standup", name: t("テクニカルスタンドアップ", "Technical Stand-up", "Levantada Técnica", "Levantada técnica", "Relevé technique", "Technisches Aufstehen", "技术起立", "테크니컬스탠드업", "Alzata tecnica", "Технический подъём", "قيام تقني", "टेक्निकल स्टैंडअप") },
];

const mountTechniques: TechniqueNode[] = [
  { id: "armbar-mount", name: t("腕十字", "Armbar", "Armlock", "Palanca al brazo", "Clé de bras", "Armhebel", "十字固", "암바", "Leva al braccio", "Рычаг локтя", "قفل الذراع", "आर्मबार") },
  { id: "cross-collar", name: t("十字絞め", "Cross Collar Choke", "Estrangulamento Cruzado", "Estrangulación cruzada", "Étranglement croisé", "Kreuzkragen-Würger", "十字绞", "크로스칼라초크", "Strangolamento crociato", "Крест", "خنق متقاطع", "क्रॉस कॉलर चोक") },
  { id: "ezekiel", name: t("エゼキエル", "Ezekiel Choke", "Ezequiel", "Ezequiel", "Ézéchiel", "Ezekiel", "以西结绞", "에제키엘", "Ezechiele", "Эзекиэль", "خنق حزقيال", "इज़ेकिएल") },
  { id: "americana-mount", name: t("アメリカーナ", "Americana", "Americana", "Americana", "Americana", "Americana", "美国锁", "아메리카나", "Americana", "Американа", "أمريكانا", "अमेरिकाना") },
];

const backControlTechniques: TechniqueNode[] = [
  { id: "rnc", name: t("リアネイキッドチョーク", "Rear Naked Choke", "Mata Leão", "Estrangulación trasera", "Étranglement arrière", "Rear Naked Choke", "裸绞", "리어네이키드초크", "Strangolamento nudo posteriore", "РНЧ", "خنق عاري خلفي", "रियर नेकेड चोक") },
  { id: "bow-arrow", name: t("ボウ＆アロー", "Bow and Arrow", "Arco e Flecha", "Arco y flecha", "Arc et flèche", "Bogen und Pfeil", "弓箭绞", "보앤애로우", "Arco e freccia", "Лук и стрела", "قوس وسهم", "बो एंड एरो") },
  { id: "armbar-back", name: t("腕十字", "Armbar", "Armlock", "Palanca al brazo", "Clé de bras", "Armhebel", "十字固", "암바", "Leva al braccio", "Рычаг локтя", "قفل الذراع", "आर्मबार") },
];

const sideControlTechniques: TechniqueNode[] = [
  { id: "americana", name: t("アメリカーナ", "Americana", "Americana", "Americana", "Americana", "Americana", "美国锁", "아메리카나", "Americana", "Американа", "أمريكانا", "अमेरिकाना") },
  { id: "kimura-sc", name: t("キムラ", "Kimura", "Kimura", "Kimura", "Kimura", "Kimura", "木村锁", "기무라", "Kimura", "Кимура", "كيمورا", "किमुरा") },
  { id: "arm-triangle", name: t("アームトライアングル", "Arm Triangle", "Kata Gatame", "Triángulo de brazo", "Triangle de bras", "Arm Dreieck", "手臂三角", "암트라이앵글", "Triangolo di braccio", "Ката-гатамэ", "مثلث الذراع", "आर्म ट्रायंगल") },
];

// Guard Pass Techniques
const closedGuardPassTechniques: TechniqueNode[] = [
  { id: "standing-pass", name: t("スタンディングパス", "Standing Pass", "Passagem em Pé", "Pasaje de pie", "Passage debout", "Stehender Pass", "站立过腿", "스탠딩패스", "Passaggio in piedi", "Стоячий пасс", "تمرير واقف", "स्टैंडिंग पास") },
  { id: "knee-slice-cg", name: t("ニースライス", "Knee Slice", "Passagem de Joelho", "Corte de rodilla", "Coupe au genou", "Knieschnitt", "膝切过腿", "니슬라이스", "Taglio di ginocchio", "Ни-слайс", "شريحة الركبة", "नी स्लाइस") },
  { id: "double-under", name: t("ダブルアンダー", "Double Under", "Passagem por Baixo", "Doble por debajo", "Double dessous", "Doppel Unter", "双下穿", "더블언더", "Doppio sotto", "Двойной андер", "تحت مزدوج", "डबल अंडर") },
  { id: "sao-paulo-pass", name: t("サンパウロパス", "Sao Paulo Pass", "Passagem São Paulo", "Pase São Paulo", "Passe São Paulo", "São Paulo Pass", "圣保罗过腿", "상파울로패스", "Passaggio São Paulo", "Сан-Паулу пасс", "تمرير ساو باولو", "साओ पाउलो पास") },
];

const openGuardPassTechniques: TechniqueNode[] = [
  { id: "torreando", name: t("トレアンド", "Toreando", "Toreando", "Toreando", "Toreando", "Toreando", "斗牛士过腿", "토레안도", "Toreando", "Тореандо", "توريندو", "टोरिंडो") },
  { id: "leg-drag", name: t("レッグドラッグ", "Leg Drag", "Leg Drag", "Arrastre de pierna", "Traînée de jambe", "Beinzug", "拖腿", "레그드래그", "Trascinamento gamba", "Лег-драг", "سحب الساق", "लेग ड्रैग") },
  { id: "knee-slice-og", name: t("ニースライス", "Knee Slice", "Passagem de Joelho", "Corte de rodilla", "Coupe au genou", "Knieschnitt", "膝切", "니슬라이스", "Taglio di ginocchio", "Ни-слайс", "شريحة الركبة", "नी स्लाइस") },
  { id: "x-pass", name: t("Xパス", "X Pass", "X Pass", "Pase X", "Passe X", "X Pass", "X过腿", "X패스", "Passaggio X", "Х-пасс", "تمرير X", "X पास") },
  { id: "stack-pass", name: t("スタックパス", "Stack Pass", "Passagem Empilhada", "Pase apilado", "Passe empilé", "Stack Pass", "折叠过腿", "스택패스", "Passaggio impilato", "Стек пасс", "تمرير مكدس", "स्टैक पास") },
];

const halfGuardPassTechniques: TechniqueNode[] = [
  { id: "knee-slide", name: t("ニースライド", "Knee Slide", "Deslize de Joelho", "Deslizamiento de rodilla", "Glissement du genou", "Knierutsche", "膝滑过腿", "니슬라이드", "Scivolata di ginocchio", "Колено-слайд", "انزلاق الركبة", "नी स्लाइड") },
  { id: "hip-switch", name: t("ヒップスイッチ", "Hip Switch", "Troca de Quadril", "Cambio de cadera", "Changement de hanche", "Hüftwechsel", "髋部切换", "힙스위치", "Cambio d'anca", "Хип-свитч", "تبديل الورك", "हिप स्विच") },
  { id: "backstep", name: t("バックステップ", "Backstep", "Passo Atrás", "Paso atrás", "Pas arrière", "Rückschritt", "后退步", "백스텝", "Passo indietro", "Бэкстеп", "خطوة للخلف", "बैकस्टेप") },
  { id: "smash-pass", name: t("スマッシュパス", "Smash Pass", "Passagem Esmagada", "Pase aplastante", "Passe écrasant", "Smash Pass", "压制过腿", "스매시패스", "Passaggio schiacciante", "Смэш пасс", "تمرير ساحق", "स्मैश पास") },
];

const dlrPassTechniques: TechniqueNode[] = [
  { id: "knee-cut-dlr", name: t("ニーカット", "Knee Cut", "Corte de Joelho", "Corte de rodilla", "Coupe au genou", "Knieschnitt", "膝切", "니컷", "Taglio di ginocchio", "Ни-кат", "قطع الركبة", "नी कट") },
  { id: "leg-weave", name: t("レッグウィーブ", "Leg Weave", "Entrelaçamento", "Entrelazamiento de pierna", "Tissage de jambe", "Beinwebung", "腿编织", "레그위브", "Intreccio di gamba", "Лег-вив", "نسج الساق", "लेग वीव") },
  { id: "dlr-smash", name: t("DLRスマッシュ", "DLR Smash", "Esmagar DLR", "DLR aplastante", "DLR écrasant", "DLR Smash", "DLR压制", "DLR스매시", "DLR schiacciante", "ДЛР смэш", "سحق DLR", "DLR स्मैश") },
];

const spiderPassTechniques: TechniqueNode[] = [
  { id: "grip-break", name: t("グリップブレイク", "Grip Break", "Quebra de Pegada", "Romper agarre", "Casser la prise", "Griffbruch", "解开抓握", "그립브레이크", "Rottura presa", "Срыв захвата", "كسر القبضة", "ग्रिप ब्रेक") },
  { id: "bull-fighter", name: t("ブルファイター", "Bull Fighter", "Toureiro", "Torero", "Toréro", "Stierkämpfer", "斗牛士", "불파이터", "Torero", "Бульфайтер", "مصارع الثيران", "बुलफाइटर") },
  { id: "spider-stack", name: t("スタックパス", "Stack Pass", "Passagem Empilhada", "Pase apilado", "Passe empilé", "Stack Pass", "折叠过腿", "스택패스", "Passaggio impilato", "Стек пасс", "تمرير مكدس", "स्टैक पास") },
];

const techniqueTree: TechniqueNode[] = [
  {
    id: "pull",
    name: t("引き込み", "Guard Pull", "Puxada de Guarda", "Entrada a guardia", "Tirage de garde", "Guard Pull", "拉防守", "가드풀", "Tirata di guardia", "Гард пулл", "سحب الحارس", "गार्ड पुल"),
    children: [
      {
        id: "closed-guard",
        name: t("クローズドガード", "Closed Guard", "Guarda Fechada", "Guardia cerrada", "Garde fermée", "Geschlossene Garde", "闭合防守", "클로즈드가드", "Guardia chiusa", "Закрытая гарда", "حارس مغلق", "क्लोज़्ड गार्ड"),
        children: [
          ...closedGuardTechniques,
          {
            id: "cg-transitions",
            name: t("→ ポジション移行", "→ Position Transitions", "→ Transições", "→ Transiciones", "→ Transitions", "→ Übergänge", "→ 位置转换", "→ 포지션전환", "→ Transizioni", "→ Переходы", "→ انتقالات", "→ पोज़िशन ट्रांज़िशन"),
            isTransition: true,
            children: [
              { 
                id: "cg-to-open", 
                name: t("→ オープンガードへ", "→ Open Guard", "→ Guarda Aberta", "→ Guardia abierta", "→ Garde ouverte", "→ Offene Garde", "→ 开放防守", "→ 오픈가드", "→ Guardia aperta", "→ Открытая гарда", "→ حارس مفتوح", "→ ओपन गार्ड"),
                isTransition: true,
                children: [
                  { id: "og-spider-from-cg", name: t("スパイダーガード", "Spider Guard", "Guarda Aranha", "Guardia araña", "Garde araignée", "Spinnengarde", "蜘蛛防守", "스파이더가드", "Guardia ragno", "Паук гарда", "حارس العنكبوت", "स्पाइडर गार्ड"), children: spiderGuardTechniques },
                  { id: "og-dlr-from-cg", name: t("デラヒーバ", "De La Riva", "De La Riva", "De La Riva", "De La Riva", "De La Riva", "德拉里瓦", "데라히바", "De La Riva", "Де Ла Рива", "دي لا ريفا", "डे ला रिवा"), children: dlrTechniques },
                  { id: "og-lasso-from-cg", name: t("ラッソーガード", "Lasso Guard", "Guarda Laço", "Guardia lazo", "Garde lasso", "Lasso Garde", "套索防守", "라쏘가드", "Guardia lasso", "Лассо гарда", "حارس لاسو", "लासो गार्ड"), children: lassoTechniques },
                ],
              },
              { 
                id: "cg-to-half", 
                name: t("→ ハーフガードへ", "→ Half Guard", "→ Meia Guarda", "→ Media guardia", "→ Demi-garde", "→ Halbgarde", "→ 半防守", "→ 하프가드", "→ Mezza guardia", "→ Полугарда", "→ نصف حارس", "→ हाफ गार्ड"),
                isTransition: true,
                children: halfGuardTechniques,
              },
              { 
                id: "cg-to-mount", 
                name: t("→ マウント（スイープ成功時）", "→ Mount (on sweep)", "→ Montada", "→ Montada", "→ Montée", "→ Mount", "→ 骑乘", "→ 마운트", "→ Montata", "→ Маунт", "→ مونت", "→ माउंट"),
                isTransition: true,
                children: mountTechniques,
              },
            ],
          },
        ],
      },
      {
        id: "open-guard",
        name: t("オープンガード", "Open Guard", "Guarda Aberta", "Guardia abierta", "Garde ouverte", "Offene Garde", "开放防守", "오픈가드", "Guardia aperta", "Открытая гарда", "حارس مفتوح", "ओपन गार्ड"),
        children: [
          {
            id: "spider-guard",
            name: t("スパイダーガード", "Spider Guard", "Guarda Aranha", "Guardia araña", "Garde araignée", "Spinnengarde", "蜘蛛防守", "스파이더가드", "Guardia ragno", "Паук гарда", "حارس العنكبوت", "स्पाइडर गार्ड"),
            children: spiderGuardTechniques,
          },
          {
            id: "de-la-riva",
            name: t("デラヒーバ", "De La Riva", "De La Riva", "De La Riva", "De La Riva", "De La Riva", "德拉里瓦", "데라히바", "De La Riva", "Де Ла Рива", "دي لا ريفا", "डे ला रिवा"),
            children: dlrTechniques,
          },
          {
            id: "lasso-guard",
            name: t("ラッソーガード", "Lasso Guard", "Guarda Laço", "Guardia lazo", "Garde lasso", "Lasso Garde", "套索防守", "라쏘가드", "Guardia lasso", "Лассо гарда", "حارس لاسو", "लासो गार्ड"),
            children: lassoTechniques,
          },
          {
            id: "og-transitions",
            name: t("→ ポジション移行", "→ Position Transitions", "→ Transições", "→ Transiciones", "→ Transitions", "→ Übergänge", "→ 位置转换", "→ 포지션전환", "→ Transizioni", "→ Переходы", "→ انتقالات", "→ पोज़िशन ट्रांज़िशन"),
            isTransition: true,
            children: [
              { 
                id: "og-to-closed", 
                name: t("→ クローズドガードへ", "→ Closed Guard", "→ Guarda Fechada", "→ Guardia cerrada", "→ Garde fermée", "→ Geschlossene Garde", "→ 闭合防守", "→ 클로즈드가드", "→ Guardia chiusa", "→ Закрытая гарда", "→ حارس مغلق", "→ क्लोज़्ड गार्ड"),
                isTransition: true,
                children: closedGuardTechniques,
              },
              { 
                id: "og-to-half", 
                name: t("→ ハーフガードへ", "→ Half Guard", "→ Meia Guarda", "→ Media guardia", "→ Demi-garde", "→ Halbgarde", "→ 半防守", "→ 하프가드", "→ Mezza guardia", "→ Полугарда", "→ نصف حارس", "→ हाफ गार्ड"),
                isTransition: true,
                children: halfGuardTechniques,
              },
              { 
                id: "og-to-xguard", 
                name: t("→ Xガードへ", "→ X Guard", "→ Guarda X", "→ Guardia X", "→ Garde X", "→ X Garde", "→ X防守", "→ X가드", "→ Guardia X", "→ Х-гарда", "→ حارس X", "→ X गार्ड"),
                isTransition: true,
                children: xGuardTechniques,
              },
            ],
          },
        ],
      },
      {
        id: "half-guard",
        name: t("ハーフガード", "Half Guard", "Meia Guarda", "Media guardia", "Demi-garde", "Halbgarde", "半防守", "하프가드", "Mezza guardia", "Полугарда", "نصف حارس", "हाफ गार्ड"),
        children: [
          ...halfGuardTechniques,
          {
            id: "hg-transitions",
            name: t("→ ポジション移行", "→ Position Transitions", "→ Transições", "→ Transiciones", "→ Transitions", "→ Übergänge", "→ 位置转换", "→ 포지션전환", "→ Transizioni", "→ Переходы", "→ انتقالات", "→ पोज़िशन ट्रांज़िशन"),
            isTransition: true,
            children: [
              { 
                id: "hg-to-closed", 
                name: t("→ クローズドガードへ", "→ Closed Guard", "→ Guarda Fechada", "→ Guardia cerrada", "→ Garde fermée", "→ Geschlossene Garde", "→ 闭合防守", "→ 클로즈드가드", "→ Guardia chiusa", "→ Закрытая гарда", "→ حارس مغلق", "→ क्लोज़्ड गार्ड"),
                isTransition: true,
                children: closedGuardTechniques,
              },
              { 
                id: "hg-to-open", 
                name: t("→ オープンガードへ", "→ Open Guard", "→ Guarda Aberta", "→ Guardia abierta", "→ Garde ouverte", "→ Offene Garde", "→ 开放防守", "→ 오픈가드", "→ Guardia aperta", "→ Открытая гарда", "→ حارس مفتوح", "→ ओपन गार्ड"),
                isTransition: true,
                children: [
                  { id: "og-spider-from-hg", name: t("スパイダーガード", "Spider Guard", "Guarda Aranha", "Guardia araña", "Garde araignée", "Spinnengarde", "蜘蛛防守", "스파이더가드", "Guardia ragno", "Паук гарда", "حارس العنكبوت", "स्पाइडर गार्ड"), children: spiderGuardTechniques },
                  { id: "og-dlr-from-hg", name: t("デラヒーバ", "De La Riva", "De La Riva", "De La Riva", "De La Riva", "De La Riva", "德拉里瓦", "데라히바", "De La Riva", "Де Ла Рива", "دي لا ريفا", "डे ला रिवा"), children: dlrTechniques },
                ],
              },
              { 
                id: "hg-to-back", 
                name: t("→ バックテイク", "→ Back Take", "→ Pegada de Costas", "→ Toma de espalda", "→ Prise du dos", "→ Rücknahme", "→ 背部控制", "→ 백테이크", "→ Presa schiena", "→ Взятие спины", "→ أخذ الظهر", "→ बैक टेक"),
                isTransition: true,
                children: backControlTechniques,
              },
              { 
                id: "hg-to-mount", 
                name: t("→ マウント（スイープ成功時）", "→ Mount (on sweep)", "→ Montada", "→ Montada", "→ Montée", "→ Mount", "→ 骑乘", "→ 마운트", "→ Montata", "→ Маунт", "→ مونت", "→ माउंट"),
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
    name: t("テイクダウン", "Takedown", "Takedown", "Derribo", "Amenée au sol", "Takedown", "摔技", "테이크다운", "Atterramento", "Тэйкдаун", "إسقاط", "टेकडाउन"),
    children: [
      {
        id: "single-leg",
        name: t("シングルレッグ", "Single Leg", "Single Leg", "Una pierna", "Une jambe", "Einbein", "单腿", "싱글레그", "Gamba singola", "Сингл", "ساق واحدة", "सिंगल लेग"),
        children: [
          { id: "running-pipe", name: t("ランニングパイプ", "Running the Pipe", "Running the Pipe", "Correr el tubo", "Courir le tuyau", "Running the Pipe", "跑管", "러닝더파이프", "Correre il tubo", "Раннинг пайп", "تشغيل الأنبوب", "रनिंग द पाइप") },
          { id: "high-crotch", name: t("ハイクロッチ", "High Crotch", "High Crotch", "Entrepierna alta", "Entrejambe haut", "High Crotch", "高叉", "하이크로치", "Cavallo alto", "Хай кроч", "منشعب عالي", "हाई क्रॉच") },
          { id: "inside-trip", name: t("インサイドトリップ", "Inside Trip", "Inside Trip", "Zancadilla interior", "Croche intérieur", "Innenreise", "内绊", "인사이드트립", "Sgambetto interno", "Инсайд трип", "رحلة داخلية", "इनसाइड ट्रिप") },
        ],
      },
      {
        id: "double-leg",
        name: t("ダブルレッグ", "Double Leg", "Double Leg", "Dos piernas", "Deux jambes", "Doppelbein", "双腿", "더블레그", "Doppia gamba", "Дабл", "ساقين", "डबल लेग"),
        children: [
          { id: "blast-double", name: t("ブラストダブル", "Blast Double", "Blast Double", "Doble explosivo", "Double explosif", "Blast Double", "爆发双腿", "블라스트더블", "Doppia esplosiva", "Бласт дабл", "انفجار مزدوج", "ब्लास्ट डबल") },
          { id: "low-single", name: t("ローシングル", "Low Single", "Low Single", "Single bajo", "Simple bas", "Niedrig Single", "低单腿", "로우싱글", "Singola bassa", "Лоу сингл", "فردي منخفض", "लो सिंगल") },
        ],
      },
      {
        id: "trips",
        name: t("足払い系", "Trips", "Rasteiras", "Barridos", "Balayages", "Feger", "踢绊", "트립", "Sgambetti", "Подсечки", "عرقلة", "ट्रिप्स"),
        children: [
          { id: "osoto-gari", name: t("大外刈り", "Osoto Gari", "Osoto Gari", "Osoto Gari", "Osoto Gari", "Osoto Gari", "大外刈", "오소토가리", "Osoto Gari", "Осото гари", "أوسوتو غاري", "ओसोटो गारी") },
          { id: "kouchi-gari", name: t("小内刈り", "Kouchi Gari", "Kouchi Gari", "Kouchi Gari", "Kouchi Gari", "Kouchi Gari", "小内刈", "코우치가리", "Kouchi Gari", "Коучи гари", "كوتشي غاري", "कौची गारी") },
          { id: "ouchi-gari", name: t("大内刈り", "Ouchi Gari", "Ouchi Gari", "Ouchi Gari", "Ouchi Gari", "Ouchi Gari", "大内刈", "오우치가리", "Ouchi Gari", "Оучи гари", "أوتشي غاري", "ओउची गारी") },
        ],
      },
      {
        id: "td-transitions",
        name: t("→ トップコントロールへ", "→ Top Control", "→ Controle de Cima", "→ Control superior", "→ Contrôle du dessus", "→ Top Kontrolle", "→ 顶部控制", "→ 탑컨트롤", "→ Controllo superiore", "→ Топ контроль", "→ تحكم علوي", "→ टॉप कंट्रोल"),
        isTransition: true,
        children: [
          {
            id: "side-control",
            name: t("サイドコントロール", "Side Control", "100 Kilos", "Control lateral", "Contrôle latéral", "Seitenkontrolle", "侧控制", "사이드컨트롤", "Controllo laterale", "Сайд контроль", "تحكم جانبي", "साइड कंट्रोल"),
            children: [
              ...sideControlTechniques,
              { 
                id: "sc-to-mount", 
                name: t("→ マウントへ", "→ Mount", "→ Montada", "→ Montada", "→ Montée", "→ Mount", "→ 骑乘", "→ 마운트", "→ Montata", "→ Маунт", "→ مونت", "→ माउंट"),
                isTransition: true,
                children: mountTechniques,
              },
              { 
                id: "sc-to-back", 
                name: t("→ バックへ", "→ Back", "→ Costas", "→ Espalda", "→ Dos", "→ Rücken", "→ 背部", "→ 백", "→ Schiena", "→ Спина", "→ ظهر", "→ बैक"),
                isTransition: true,
                children: backControlTechniques,
              },
            ],
          },
          {
            id: "mount",
            name: t("マウント", "Mount", "Montada", "Montada", "Montée", "Mount", "骑乘", "마운트", "Montata", "Маунт", "مونت", "माउंट"),
            children: [
              ...mountTechniques,
              { 
                id: "mount-to-back", 
                name: t("→ バックへ", "→ Back", "→ Costas", "→ Espalda", "→ Dos", "→ Rücken", "→ 背部", "→ 백", "→ Schiena", "→ Спина", "→ ظهر", "→ बैक"),
                isTransition: true,
                children: backControlTechniques,
              },
            ],
          },
          {
            id: "back-control",
            name: t("バックコントロール", "Back Control", "Controle de Costas", "Control de espalda", "Contrôle du dos", "Rückenkontrolle", "背部控制", "백컨트롤", "Controllo schiena", "Бэк контроль", "تحكم الظهر", "बैक कंट्रोल"),
            children: backControlTechniques,
          },
        ],
      },
    ],
  },
  {
    id: "guard-pass",
    name: t("ガードパス", "Guard Pass", "Passagem de Guarda", "Pasaje de guardia", "Passage de garde", "Guard Pass", "过腿", "가드패스", "Passaggio di guardia", "Гард пасс", "تمرير الحارس", "गार्ड पास"),
    children: [
      {
        id: "pass-closed-guard",
        name: t("クローズドガードパス", "Closed Guard Pass", "Passagem de Guarda Fechada", "Pasaje de guardia cerrada", "Passage garde fermée", "Geschlossener Garde Pass", "闭合防守过腿", "클로즈드가드패스", "Passaggio guardia chiusa", "Пасс закрытой гарды", "تمرير الحارس المغلق", "क्लोज़्ड गार्ड पास"),
        children: [
          ...closedGuardPassTechniques,
          {
            id: "cg-pass-result",
            name: t("→ パス成功後", "→ After Pass", "→ Após Passar", "→ Después del pase", "→ Après passage", "→ Nach Pass", "→ 过腿后", "→ 패스후", "→ Dopo passaggio", "→ После пасса", "→ بعد التمرير", "→ पास के बाद"),
            isTransition: true,
            children: [
              { id: "cg-pass-to-side", name: t("サイドコントロール", "Side Control", "100 Kilos", "Control lateral", "Contrôle latéral", "Seitenkontrolle", "侧控制", "사이드컨트롤", "Controllo laterale", "Сайд контроль", "تحكم جانبي", "साइड कंट्रोल"), children: sideControlTechniques },
              { id: "cg-pass-to-mount", name: t("マウント", "Mount", "Montada", "Montada", "Montée", "Mount", "骑乘", "마운트", "Montata", "Маунт", "مونت", "माउंट"), children: mountTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-open-guard",
        name: t("オープンガードパス", "Open Guard Pass", "Passagem de Guarda Aberta", "Pasaje de guardia abierta", "Passage garde ouverte", "Offener Garde Pass", "开放防守过腿", "오픈가드패스", "Passaggio guardia aperta", "Пасс открытой гарды", "تمرير الحارس المفتوح", "ओपन गार्ड पास"),
        children: [
          ...openGuardPassTechniques,
          {
            id: "og-pass-result",
            name: t("→ パス成功後", "→ After Pass", "→ Após Passar", "→ Después del pase", "→ Après passage", "→ Nach Pass", "→ 过腿后", "→ 패스후", "→ Dopo passaggio", "→ После пасса", "→ بعد التمرير", "→ पास के बाद"),
            isTransition: true,
            children: [
              { id: "og-pass-to-side", name: t("サイドコントロール", "Side Control", "100 Kilos", "Control lateral", "Contrôle latéral", "Seitenkontrolle", "侧控制", "사이드컨트롤", "Controllo laterale", "Сайд контроль", "تحكم جانبي", "साइड कंट्रोल"), children: sideControlTechniques },
              { id: "og-pass-to-mount", name: t("マウント", "Mount", "Montada", "Montada", "Montée", "Mount", "骑乘", "마운트", "Montata", "Маунт", "مونت", "माउंट"), children: mountTechniques },
              { id: "og-pass-to-back", name: t("バック（レッグドラッグから）", "Back (from Leg Drag)", "Costas", "Espalda", "Dos", "Rücken", "背部", "백", "Schiena", "Спина", "ظهر", "बैक"), children: backControlTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-half-guard",
        name: t("ハーフガードパス", "Half Guard Pass", "Passagem de Meia Guarda", "Pasaje de media guardia", "Passage demi-garde", "Halbgarde Pass", "半防守过腿", "하프가드패스", "Passaggio mezza guardia", "Пасс полугарды", "تمرير نصف الحارس", "हाफ गार्ड पास"),
        children: [
          ...halfGuardPassTechniques,
          {
            id: "hg-pass-result",
            name: t("→ パス成功後", "→ After Pass", "→ Após Passar", "→ Después del pase", "→ Après passage", "→ Nach Pass", "→ 过腿后", "→ 패스후", "→ Dopo passaggio", "→ После пасса", "→ بعد التمرير", "→ पास के बाद"),
            isTransition: true,
            children: [
              { id: "hg-pass-to-side", name: t("サイドコントロール", "Side Control", "100 Kilos", "Control lateral", "Contrôle latéral", "Seitenkontrolle", "侧控制", "사이드컨트롤", "Controllo laterale", "Сайд контроль", "تحكم جانبي", "साइड कंट्रोल"), children: sideControlTechniques },
              { id: "hg-pass-to-mount", name: t("マウント", "Mount", "Montada", "Montada", "Montée", "Mount", "骑乘", "마운트", "Montata", "Маунт", "مونت", "माउंट"), children: mountTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-dlr",
        name: t("デラヒーバパス", "De La Riva Pass", "Passagem de DLR", "Pasaje de DLR", "Passage DLR", "DLR Pass", "DLR过腿", "데라히바패스", "Passaggio DLR", "ДЛР пасс", "تمرير DLR", "डे ला रिवा पास"),
        children: [
          ...dlrPassTechniques,
          {
            id: "dlr-pass-result",
            name: t("→ パス成功後", "→ After Pass", "→ Após Passar", "→ Después del pase", "→ Après passage", "→ Nach Pass", "→ 过腿后", "→ 패스후", "→ Dopo passaggio", "→ После пасса", "→ بعد التمرير", "→ पास के बाद"),
            isTransition: true,
            children: [
              { id: "dlr-pass-to-side", name: t("サイドコントロール", "Side Control", "100 Kilos", "Control lateral", "Contrôle latéral", "Seitenkontrolle", "侧控制", "사이드컨트롤", "Controllo laterale", "Сайд контроль", "تحكم جانبي", "साइड कंट्रोल"), children: sideControlTechniques },
              { id: "dlr-pass-to-back", name: t("バック", "Back", "Costas", "Espalda", "Dos", "Rücken", "背部", "백", "Schiena", "Спина", "ظهر", "बैक"), children: backControlTechniques },
            ],
          },
        ],
      },
      {
        id: "pass-spider",
        name: t("スパイダーガードパス", "Spider Guard Pass", "Passagem de Guarda Aranha", "Pasaje de guardia araña", "Passage garde araignée", "Spinnengarde Pass", "蜘蛛防守过腿", "스파이더가드패스", "Passaggio guardia ragno", "Паук гарда пасс", "تمرير حارس العنكبوت", "स्पाइडर गार्ड पास"),
        children: [
          ...spiderPassTechniques,
          {
            id: "spider-pass-result",
            name: t("→ パス成功後", "→ After Pass", "→ Após Passar", "→ Después del pase", "→ Après passage", "→ Nach Pass", "→ 过腿后", "→ 패스후", "→ Dopo passaggio", "→ После пасса", "→ بعد التمرير", "→ पास के बाद"),
            isTransition: true,
            children: [
              { id: "spider-pass-to-side", name: t("サイドコントロール", "Side Control", "100 Kilos", "Control lateral", "Contrôle latéral", "Seitenkontrolle", "侧控制", "사이드컨트롤", "Controllo laterale", "Сайд контроль", "تحكم جانبي", "साइड कंट्रोल"), children: sideControlTechniques },
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
    return node.name[language as Language] || node.name.en;
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

  const titles: Record<Language, string> = {
    ja: "技のフローチャート",
    en: "Technique Flowchart",
    pt: "Fluxograma de Técnicas",
    es: "Diagrama de Técnicas",
    fr: "Organigramme des Techniques",
    de: "Technik-Flussdiagramm",
    zh: "技术流程图",
    ko: "기술 플로차트",
    it: "Diagramma delle Tecniche",
    ru: "Схема техник",
    ar: "مخطط التقنيات",
    hi: "तकनीक फ़्लोचार्ट",
  };

  const descriptions: Record<Language, string> = {
    ja: "柔術の技は「引き込み」「テイクダウン」「ガードパス」に分岐します。各項目をクリックして展開し、ポジション移行から次の技を選べます。",
    en: "BJJ techniques branch into 'Guard Pull', 'Takedown', and 'Guard Pass'. Click to expand and explore transitions.",
    pt: "As técnicas de BJJ se dividem em 'Puxada', 'Takedown' e 'Passagem'. Clique para expandir e explorar.",
    es: "Las técnicas de BJJ se dividen en 'Entrada', 'Derribo' y 'Pasaje'. Haz clic para expandir y explorar.",
    fr: "Les techniques de JJB se divisent en 'Tirage', 'Amenée' et 'Passage'. Cliquez pour développer et explorer.",
    de: "BJJ-Techniken verzweigen sich in 'Guard Pull', 'Takedown' und 'Guard Pass'. Klicken Sie zum Erweitern.",
    zh: "巴西柔术技术分为'拉防守'、'摔技'和'过腿'。点击展开并探索转换。",
    ko: "BJJ 기술은 '가드풀', '테이크다운', '가드패스'로 나뉩니다. 클릭하여 전환을 탐색하세요.",
    it: "Le tecniche di BJJ si dividono in 'Tirata', 'Atterramento' e 'Passaggio'. Clicca per espandere ed esplorare.",
    ru: "Техники БЖЖ делятся на 'Гард пулл', 'Тэйкдаун' и 'Гард пасс'. Нажмите для раскрытия и изучения переходов.",
    ar: "تنقسم تقنيات BJJ إلى 'سحب الحارس' و'الإسقاط' و'تمرير الحارس'. انقر للتوسيع والاستكشاف.",
    hi: "BJJ तकनीकें 'गार्ड पुल', 'टेकडाउन' और 'गार्ड पास' में विभाजित होती हैं। विस्तार के लिए क्लिक करें।",
  };

  return (
    <section className="py-16 max-w-5xl mx-auto">
      <h2 className="text-4xl font-light mb-4 text-center">
        {titles[language as Language] || titles.en}
      </h2>
      <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
        {descriptions[language as Language] || descriptions.en}
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
