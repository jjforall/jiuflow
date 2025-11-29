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
  // ... 以降のデータは長すぎるため、後でインポート関数を実行
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
