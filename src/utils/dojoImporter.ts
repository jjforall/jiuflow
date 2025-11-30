import { supabase } from "@/integrations/supabase/client";

// Excelファイルから抽出した道場データ
export const dojoData = [
  // 北海道
  { federation: "JBJJF", region: "北海道", name: "パラエストラ札幌 （PARAESTRA SAPPORO）", academy: "2652", instructor: "俵谷実", address: "北海道札幌市東区北九条東10丁目3-26 パールコート光星10 1F", phone: "011-733-5301", url: "https://www.facebook.com/paraestrasapporo/" },
  { federation: "JBJJF", region: "北海道", name: "ベラトレオ （BELLATLEO）", academy: "3133", instructor: "藤本勤", address: "北海道函館市桔梗町402番地4", phone: "", url: "http://bellatleo.com" },
  { federation: "JBJJF", region: "北海道", name: "ギムナシオン札幌 （GYMNASION SAPPORO）", academy: "3189", instructor: "高橋計康", address: "北海道札幌市東区北11条東5丁目1-12 ケイ・ワールド", phone: "011-712-1100", url: "" },
  { federation: "JBJJF", region: "北海道", name: "パラエストラ室蘭 （PARAESTRA MURORAN）", academy: "3268", instructor: "工藤匡敏", address: "", phone: "", url: "https://www.facebook.com/paramurobjj/" },
  { federation: "JBJJF", region: "北海道", name: "ALMA FIGHT GYM BASE （ALMA FIGHT GYM BASE）", academy: "6545", instructor: "室谷司", address: "北海道札幌市北区新琴似7条9丁目5−15 七番街ビル", phone: "080-4770-8379", url: "http://afgbase.com/" },
  { federation: "JBJJF", region: "北海道", name: "小樽MMAアカデミーデサフィオ （OTARU MMA ACADEMY DESAFIO）", academy: "9368", instructor: "小林充", address: "北海道小樽市住ノ江1-4-19", phone: "", url: "https://mmabjj.jp/" },
  { federation: "JBJJF", region: "北海道", name: "Carpe Diem Tokachi （CARPE DIEM TOKACHI）", academy: "9596", instructor: "田中義篤", address: "北海道河東郡音更町宝来東町南1-11-1", phone: "090-8987-3400", url: "https://carpediem-tokachi.com/" },
  { federation: "JBJJF", region: "北海道", name: "江別柔術 （EBETSU JIU‐JITSU）", academy: "10133", instructor: "江崎壽", address: "北海道江別市上江別南町14-1", phone: "", url: "" },
  { federation: "JBJJF", region: "北海道", name: "Roughters Gym （ROUGHTERS GYM）", academy: "10583", instructor: "室谷司", address: "北海道帯広市大通南16丁目1-1", phone: "080-5582-9971", url: "https://roughters.com/" },
  { federation: "JBJJF", region: "北海道", name: "Luz E Esperanca （LUZ E ESPERANCA）", academy: "11136", instructor: "今成正和", address: "", phone: "", url: "" },
  { federation: "JBJJF", region: "北海道", name: "千羽柔術 （SENBA JIU‐JITSU）", academy: "11521", instructor: "細川顕", address: "北海道札幌札幌市中央区北5条西12丁目2-10", phone: "070-1139-5036", url: "" },
  { federation: "JBJJF", region: "北海道", name: "S.F.I.T （S.F.I.T）", academy: "9402", instructor: "江崎壽", address: "北海道札幌市東区北15条東16丁目 ダイアパレスターミナル15-202号室", phone: "011-374-1496", url: "" },
  { federation: "JBJJF", region: "北海道", name: "CORE QUEST KUSHIRO （CORE QUEST KUSHIRO）", academy: "12602", instructor: "室谷司", address: "北海道釧路市松浦町2-5", phone: "090-9511-1244", url: "https://core-quest-kushiro.com/" },
  { federation: "JBJJF", region: "北海道", name: "藤柔術 （FUJI JIU-JITSU）", academy: "5517", instructor: "伊藤尚司", address: "", phone: "", url: "https://fuji-jiujitsu.jimdosite.com/" },
];

// JiuFlow重点調査道場データ
export const featuredDojos = [
  {
    name: "OVERLIMIT SAPPORO",
    name_ja: "オーバーリミット札幌",
    name_pt: "OVERLIMIT SAPPORO",
    description: "First Gracie lineage black belt in Hokkaido. Led by 2-time world champion Ryozo Murata, President of Sports Jiu-Jitsu Japan Federation. SJJIF certified academy with shower facilities.",
    description_ja: "北海道初のグレイシー直系黒帯保持者・村田良蔵代表（2年連続世界チャンピオン）が運営。スポーツ柔術日本連盟会長が直轄するSJJIF公認アカデミー。シャワールーム完備の清潔な環境。",
    description_pt: "Primeiro faixa preta da linhagem Gracie em Hokkaido. Liderado pelo bicampeão mundial Ryozo Murata, presidente da Federação Japonesa de Jiu-Jitsu Esportivo.",
    location: "北海道札幌市",
    website: "https://overlimit-sapporo.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["グレイシー直系", "世界チャンピオン指導", "SJJIF公認", "初心者〜プロ対応", "キッズ・女性専用クラス"],
      pricing: { entry_fee: "11,000円", monthly: "約10,000円", campaign: "入会金・事務手数料無料＋道着・帯プレゼント" }
    }),
    is_verified: true
  },
  {
    name: "CHECKMAT TOKYO",
    name_ja: "チェックマット東京",
    name_pt: "CHECKMAT TOKYO",
    description: "2021 World Team Champions. One of the world's premier BJJ teams with 500+ affiliates globally. Safety-focused curriculum with technique training before sparring.",
    description_ja: "2021年団体世界優勝の実績を持つ世界有数チーム。世界500以上の支部との交流可能。技術習得後のスパーリングによる安全重視のカリキュラム。初心者クラス毎日開催。",
    description_pt: "Campeões mundiais por equipes em 2021. Uma das principais equipes de BJJ do mundo com mais de 500 afiliados globalmente.",
    location: "東京都",
    website: "https://checkmattokyo.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["2021年団体世界一", "初心者クラス毎日開催", "レベル別5段階クラス", "MMAクラス有"],
      pricing: { entry_fee: "10,000円", monthly_male: "12,000円", monthly_female: "11,000円", sunday_only: "1,500円/回" },
      schedule: { beginner: "月水金土日", no_gi: "火曜", mma: "木曜" }
    }),
    is_verified: true
  },
  {
    name: "AXIS JIU-JITSU ACADEMY",
    name_ja: "AXIS柔術アカデミー",
    name_pt: "AXIS JIU-JITSU ACADEMY",
    description: "Women and student friendly pricing (up to 40% OFF). Flexible plans from 6 classes per month. 2 minutes walk from Meidaimae Station.",
    description_ja: "女性・学生大幅割引（最大40%OFF）。月6クラスから選べる柔軟なプラン。明大前駅徒歩2分の好立地。世田谷区松原で初心者から上級者まで対応。",
    description_pt: "Preços amigáveis para mulheres e estudantes (até 40% OFF). Planos flexíveis a partir de 6 aulas por mês.",
    location: "東京都世田谷区松原",
    website: "http://axisjj.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["女性・学生40%割引", "月6回から選択可", "明大前駅徒歩2分", "キッズクラス充実"],
      pricing: {
        male: { "6classes": "11,000円", "15classes": "17,600円", unlimited: "22,000円" },
        female_student: { "6classes": "6,600円", "15classes": "11,000円", unlimited: "17,600円" }
      }
    }),
    is_verified: true
  },
  {
    name: "IMANARI JIU-JITSU",
    name_ja: "今成柔術",
    name_pt: "IMANARI JIU-JITSU",
    description: "Legendary leg lock specialist Masakazu Imanari's academy. No reservation required for open mat (exceptional flexibility). 3 minutes from Yotsuya-Sanchome Station.",
    description_ja: "「足関十段」今成正和直伝の足関節技専門アカデミー。出稽古は予約不要（異例の柔軟性）。四谷三丁目駅徒歩3分の好アクセス。初月入会金無料キャンペーン実施中。",
    description_pt: "Academia do lendário especialista em leg locks Masakazu Imanari. Sem necessidade de reserva para treino aberto.",
    location: "東京都四谷三丁目",
    website: "https://imanari-jiujitsu.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["足関十段直伝", "予約不要の出稽古", "四谷三丁目駅3分", "無料体験実施中"],
      pricing: { entry_fee: "0円（キャンペーン中）", first_month: "16,000円" }
    }),
    is_verified: true
  },
  {
    name: "CARPE DIEM AOYAMA",
    name_ja: "カルペディエム青山本部道場",
    name_pt: "CARPE DIEM AOYAMA",
    description: "'More than Jiu-Jitsu' concept. BJJ as a lifestyle brand with premium apparel line. Multinational community for adults. 8 minutes from Omotesando Station.",
    description_ja: "「More than Jiu-Jitsu」をコンセプトに柔術の枠を超えたコミュニティ。スタイリッシュなアパレルライン展開。多国籍・幅広い年代が集う「大人の部活動」。表参道駅徒歩8分。",
    description_pt: "Conceito 'Mais que Jiu-Jitsu'. BJJ como marca de estilo de vida com linha de vestuário premium. Comunidade multinacional.",
    location: "東京都南青山4-26-16-1F",
    website: "https://www.carpediem-aoyama.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["ライフスタイルブランド", "プレミアムアパレル", "多国籍コミュニティ", "表参道駅8分"],
      pricing: { fulltime: "17,600円", "8days": "14,300円", student: "13,200円", kids: "13,200円" }
    }),
    is_verified: true
  },
  {
    name: "CAVE BJJ",
    name_ja: "CAVE BJJ",
    name_pt: "CAVE BJJ",
    description: "Total MMA facility: BJJ + Weight Training + Kickboxing + MMA. 0 minutes walk from Honjo-Azumabashi Station. Master membership for all facilities.",
    description_ja: "柔術+筋トレ+キックボクシング+MMAの総合格闘技施設。本所吾妻橋駅徒歩0分の超好立地。マスター会員制度で全施設利用可能。シャワー2室、更衣室3室完備。",
    description_pt: "Instalação total de MMA: BJJ + Musculação + Kickboxing + MMA. 0 minutos a pé da estação Honjo-Azumabashi.",
    location: "東京都墨田区本所吾妻橋",
    website: "https://bjj.cave-gym.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["総合格闘技施設", "駅徒歩0分", "8段階クラス構成", "シャワー・更衣室充実"],
      classes: ["リトルキッズ", "キッズ", "はじめて柔術", "ベーシック", "オールレベル", "コンペティション", "スパー", "オープンマット"]
    }),
    is_verified: true
  },
  {
    name: "YAWARA",
    name_ja: "YAWARA",
    name_pt: "YAWARA",
    description: "'Castle in the Sky' - Harajuku top floor 2-level facility. BJJ (8F) + cutting-edge personal training (9F). Wellbeing-focused with AI technology integration.",
    description_ja: "「天空の城」と称される原宿最上階2フロア。柔術（8F）+ 最先端パーソナルトレーニング（9F）の複合施設。「柔能制剛」をコンセプトに精神面も重視。AIテクノロジー活用。",
    description_pt: "'Castelo no Céu' - Instalação de 2 andares no topo de Harajuku. BJJ (8F) + treinamento pessoal de ponta (9F).",
    location: "東京都原宿",
    website: "https://yawara.fit/",
    phone: "",
    features: JSON.stringify({
      highlights: ["原宿最上階", "ウェルビーイング重視", "AIテクノロジー", "2フロア複合施設"],
      facilities: { floor8: "柔術アカデミー 10:00-21:30", floor9: "ウェルビーイングデザイン 10:00-21:00" }
    }),
    is_verified: true
  },
  {
    name: "SWEEP JIU-JITSU ACADEMY",
    name_ja: "SWEEP柔術アカデミー",
    name_pt: "SWEEP JIU-JITSU ACADEMY",
    description: "Grand opening July 1, 2025. 'Redefining martial arts gym image' with sophisticated space. BJJ as a lifestyle proposal in Sendagaya.",
    description_ja: "2025年7月1日グランドオープン。「従来の格闘技ジムのイメージを覆す」洗練された空間。柔術をライフスタイルとして提案。アパレル展示と共存する新しい道場スタイル。",
    description_pt: "Inauguração em 1º de julho de 2025. 'Redefinindo a imagem de academia de artes marciais' com espaço sofisticado.",
    location: "東京都千駄ヶ谷",
    website: "https://sweep.love/academy",
    phone: "",
    features: JSON.stringify({
      highlights: ["2025年7月新設", "革新的空間デザイン", "ライフスタイル提案", "アパレル併設"],
      opening: "2025年7月1日"
    }),
    is_verified: true
  },
  {
    name: "TOYATT JIU-JITSU",
    name_ja: "TOYATT柔術",
    name_pt: "TOYATT JIU-JITSU",
    description: "'Not scary BJJ' motto. 'TRIATA' (try at all) concept for complete beginners. Free entry fee with same-day enrollment after trial. 10+ instructors specialized in beginner support.",
    description_ja: "「トリアタ」（兎にも角にも）コンセプト。「怖くないブラジリアン柔術」をモットーに初心者を徹底サポート。無料体験当日入会で入会金無料。10名以上のインストラクター在籍。",
    description_pt: "Lema 'BJJ não assustador'. Conceito 'TRIATA' (tentar de qualquer forma) para iniciantes completos.",
    location: "東京都大泉学園",
    website: "https://toyatt-bjj.com/",
    phone: "",
    features: JSON.stringify({
      highlights: ["初心者最重視", "怖くない柔術", "当日入会で入会金無料", "インストラクター10名以上"],
      pricing: { entry_fee: "10,000円", processing_fee: "3,000円", campaign: "無料体験当日入会で入会金免除" }
    }),
    is_verified: true
  }
];

export async function importDojosToDatabase() {
  try {
    const response = await supabase.functions.invoke("import-dojos", {
      body: { dojos: dojoData },
    });

    if (response.error) throw response.error;

    console.log("Import result:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error importing dojos:", error);
    throw error;
  }
}

export async function importFeaturedDojosToDatabase() {
  try {
    const response = await supabase.functions.invoke("import-dojos", {
      body: { dojos: featuredDojos },
    });

    if (response.error) throw response.error;

    console.log("Import featured dojos result:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error importing featured dojos:", error);
    throw error;
  }
}
