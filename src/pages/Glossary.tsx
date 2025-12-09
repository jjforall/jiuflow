import { useState, useMemo } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
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
  // Positions
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
    term: "Open Guard",
    termJa: "オープンガード",
    termPt: "Guarda Aberta",
    definition: "Any guard position where your legs are not locked around your opponent.",
    definitionJa: "足を相手に巻きつけていないガードポジションの総称。",
    definitionPt: "Qualquer posição de guarda onde suas pernas não estão travadas ao redor do oponente.",
    category: "position"
  },
  {
    term: "Spider Guard",
    termJa: "スパイダーガード",
    termPt: "Guarda Aranha",
    definition: "A guard using sleeve grips with feet on opponent's biceps for control and sweeps.",
    definitionJa: "袖を掴み、足を相手の二頭筋に当てて距離を管理するガード。",
    definitionPt: "Uma guarda usando pegadas nas mangas com os pés nos bíceps do oponente.",
    category: "position"
  },
  {
    term: "De La Riva Guard",
    termJa: "デラヒーバガード",
    termPt: "Guarda De La Riva",
    definition: "A guard where you hook your leg around the outside of opponent's leg from the inside.",
    definitionJa: "相手の足の内側から外側に足をフックするガード。リカルド・デラヒーバが有名。",
    definitionPt: "Uma guarda onde você engancha sua perna por fora da perna do oponente a partir de dentro.",
    category: "position"
  },
  {
    term: "Lasso Guard",
    termJa: "ラッソガード",
    termPt: "Guarda Laço",
    definition: "A guard where your leg wraps around opponent's arm like a lasso.",
    definitionJa: "足を相手の腕に投げ縄のように巻きつけるガード。",
    definitionPt: "Uma guarda onde sua perna envolve o braço do oponente como um laço.",
    category: "position"
  },
  {
    term: "X-Guard",
    termJa: "Xガード",
    termPt: "Guarda X",
    definition: "A guard position underneath your opponent with legs forming an X shape around their leg.",
    definitionJa: "相手の下に潜り、足でX字を作って相手の足をコントロールするガード。",
    definitionPt: "Uma posição de guarda embaixo do oponente com as pernas formando um X ao redor da perna dele.",
    category: "position"
  },
  {
    term: "Butterfly Guard",
    termJa: "バタフライガード",
    termPt: "Guarda Borboleta",
    definition: "A seated guard with both feet hooked inside your opponent's thighs.",
    definitionJa: "座った状態で両足を相手の太ももの内側にフックするガード。",
    definitionPt: "Uma guarda sentada com ambos os pés enganchados dentro das coxas do oponente.",
    category: "position"
  },
  {
    term: "Knee Shield",
    termJa: "ニーシールド",
    termPt: "Joelho Escudo",
    definition: "Using your knee as a frame to create distance and protect against passes.",
    definitionJa: "膝をフレームとして使い、距離を作りパスを防ぐ。",
    definitionPt: "Usar o joelho como uma moldura para criar distância e proteger contra passagens.",
    category: "position"
  },
  {
    term: "Turtle",
    termJa: "タートル",
    termPt: "Tartaruga",
    definition: "A defensive position on hands and knees with head tucked.",
    definitionJa: "四つん這いで頭を守る防御姿勢。",
    definitionPt: "Uma posição defensiva de quatro com a cabeça protegida.",
    category: "position"
  },
  {
    term: "North-South",
    termJa: "ノースサウス",
    termPt: "Norte-Sul",
    definition: "A pinning position where you lay chest-to-chest with opponent, head-to-toe aligned.",
    definitionJa: "相手と胸を合わせ、頭と足が逆向きになる押さえ込みポジション。",
    definitionPt: "Uma posição de imobilização onde você deita peito a peito com o oponente, alinhado cabeça a pé.",
    category: "position"
  },
  {
    term: "Knee on Belly",
    termJa: "ニーオンベリー",
    termPt: "Joelho na Barriga",
    definition: "A dominant position with your knee pressing into opponent's stomach.",
    definitionJa: "膝を相手の腹に押し付ける支配的なポジション。",
    definitionPt: "Uma posição dominante com o joelho pressionando o estômago do oponente.",
    category: "position"
  },
  {
    term: "Crucifix",
    termJa: "クルシフィックス",
    termPt: "Crucifixo",
    definition: "A controlling position trapping opponent's arms spread apart like a cross.",
    definitionJa: "相手の両腕を十字架のように広げてコントロールするポジション。",
    definitionPt: "Uma posição de controle prendendo os braços do oponente abertos como uma cruz.",
    category: "position"
  },
  // Submissions
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
    term: "Omoplata",
    termJa: "オモプラッタ",
    termPt: "Omoplata",
    definition: "A shoulder lock using your legs to rotate the opponent's shoulder.",
    definitionJa: "足を使って相手の肩を回転させる肩関節技。",
    definitionPt: "Uma chave de ombro usando suas pernas para rotacionar o ombro do oponente.",
    category: "submission"
  },
  {
    term: "Ezekiel Choke",
    termJa: "エゼキエルチョーク",
    termPt: "Ezequiel",
    definition: "A choke using the sleeve of your gi to apply pressure to the neck.",
    definitionJa: "道着の袖を使って首を絞める技。",
    definitionPt: "Um estrangulamento usando a manga do seu kimono para aplicar pressão no pescoço.",
    category: "submission"
  },
  {
    term: "Bow and Arrow",
    termJa: "ボウアンドアロー",
    termPt: "Arco e Flecha",
    definition: "A powerful collar choke from back control using the gi.",
    definitionJa: "バックコントロールから道着を使って極める強力な襟絞め。",
    definitionPt: "Um poderoso estrangulamento de gola do controle das costas usando o kimono.",
    category: "submission"
  },
  {
    term: "Cross Collar Choke",
    termJa: "クロスカラーチョーク",
    termPt: "Estrangulamento Cruzado",
    definition: "A choke using crossed grips on opponent's collar.",
    definitionJa: "相手の襟を交差させて掴んで絞める技。",
    definitionPt: "Um estrangulamento usando pegadas cruzadas na gola do oponente.",
    category: "submission"
  },
  {
    term: "Baseball Bat Choke",
    termJa: "ベースボールバットチョーク",
    termPt: "Estrangulamento Taco de Beisebol",
    definition: "A choke with grip positioning similar to holding a baseball bat.",
    definitionJa: "野球のバットを握るような手の位置で極める絞め技。",
    definitionPt: "Um estrangulamento com posicionamento de pegada similar a segurar um taco de beisebol.",
    category: "submission"
  },
  {
    term: "Heel Hook",
    termJa: "ヒールフック",
    termPt: "Heel Hook",
    definition: "A dangerous leg lock attacking the knee by twisting the heel.",
    definitionJa: "踵を捻って膝を攻撃する危険な足関節技。",
    definitionPt: "Uma chave de perna perigosa atacando o joelho torcendo o calcanhar.",
    category: "submission"
  },
  {
    term: "Kneebar",
    termJa: "膝十字固め",
    termPt: "Chave de Joelho",
    definition: "A leg lock that hyperextends the knee joint.",
    definitionJa: "膝関節を過伸展させる足関節技。",
    definitionPt: "Uma chave de perna que hiperextende a articulação do joelho.",
    category: "submission"
  },
  {
    term: "Ankle Lock",
    termJa: "アンクルロック",
    termPt: "Chave de Tornozelo",
    definition: "A submission targeting the ankle joint.",
    definitionJa: "足首の関節を狙う極め技。",
    definitionPt: "Uma finalização visando a articulação do tornozelo.",
    category: "submission"
  },
  {
    term: "Toe Hold",
    termJa: "トーホールド",
    termPt: "Chave de Pé",
    definition: "A foot lock that twists the foot and attacks the ankle.",
    definitionJa: "足を捻って足首を攻撃する足関節技。",
    definitionPt: "Uma chave de pé que torce o pé e ataca o tornozelo.",
    category: "submission"
  },
  {
    term: "Calf Slicer",
    termJa: "カーフスライサー",
    termPt: "Fatia de Panturrilha",
    definition: "A compression lock on the calf muscle.",
    definitionJa: "ふくらはぎの筋肉を圧迫する関節技。",
    definitionPt: "Uma chave de compressão no músculo da panturrilha.",
    category: "submission"
  },
  {
    term: "Wristlock",
    termJa: "リストロック",
    termPt: "Chave de Pulso",
    definition: "A joint lock attacking the wrist.",
    definitionJa: "手首の関節を攻撃する技。",
    definitionPt: "Uma chave articular atacando o pulso.",
    category: "submission"
  },
  {
    term: "D'Arce Choke",
    termJa: "ダースチョーク",
    termPt: "D'Arce",
    definition: "An arm triangle variation entered from the side.",
    definitionJa: "横から入る腕三角絞めのバリエーション。",
    definitionPt: "Uma variação do triângulo de braço entrada pela lateral.",
    category: "submission"
  },
  {
    term: "Anaconda Choke",
    termJa: "アナコンダチョーク",
    termPt: "Anaconda",
    definition: "An arm triangle choke similar to D'Arce but entered differently.",
    definitionJa: "ダースに似た腕三角絞めだが、入り方が異なる。",
    definitionPt: "Um estrangulamento triângulo de braço similar ao D'Arce mas com entrada diferente.",
    category: "submission"
  },
  {
    term: "Von Flue Choke",
    termJa: "ヴォンフルーチョーク",
    termPt: "Von Flue",
    definition: "A choke applied using shoulder pressure when opponent attempts guillotine.",
    definitionJa: "相手がギロチンを狙った時に肩の圧力で極める絞め技。",
    definitionPt: "Um estrangulamento aplicado usando pressão do ombro quando o oponente tenta guilhotina.",
    category: "submission"
  },
  // Techniques
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
    term: "Takedown",
    termJa: "テイクダウン",
    termPt: "Queda",
    definition: "Techniques to bring an opponent from standing to the ground.",
    definitionJa: "立った相手を地面に倒す技術。",
    definitionPt: "Técnicas para levar o oponente de pé ao chão.",
    category: "technique"
  },
  {
    term: "Guard Pull",
    termJa: "ガードプル",
    termPt: "Puxada de Guarda",
    definition: "Intentionally going to your back to play guard.",
    definitionJa: "意図的に背中をつけてガードを展開すること。",
    definitionPt: "Ir intencionalmente para as costas para jogar guarda.",
    category: "technique"
  },
  {
    term: "Berimbolo",
    termJa: "ベリンボロ",
    termPt: "Berimbolo",
    definition: "A spinning inversion technique used to take the back.",
    definitionJa: "回転してバックを取るインバーション技術。",
    definitionPt: "Uma técnica de inversão giratória usada para pegar as costas.",
    category: "technique"
  },
  {
    term: "Scissor Sweep",
    termJa: "シザースイープ",
    termPt: "Raspagem Tesoura",
    definition: "A fundamental sweep using a scissoring motion with your legs.",
    definitionJa: "足をハサミのように使う基本的なスイープ。",
    definitionPt: "Uma raspagem fundamental usando um movimento de tesoura com as pernas.",
    category: "technique"
  },
  {
    term: "Hip Bump Sweep",
    termJa: "ヒップバンプスイープ",
    termPt: "Raspagem de Quadril",
    definition: "A sweep using explosive hip movement to off-balance opponent.",
    definitionJa: "腰の爆発的な動きで相手のバランスを崩すスイープ。",
    definitionPt: "Uma raspagem usando movimento explosivo de quadril para desequilibrar o oponente.",
    category: "technique"
  },
  {
    term: "Toreando Pass",
    termJa: "トレアンドパス",
    termPt: "Passagem Toreando",
    definition: "A guard pass pushing opponent's legs to the side like a bullfighter.",
    definitionJa: "闘牛士のように相手の足を横に押すガードパス。",
    definitionPt: "Uma passagem de guarda empurrando as pernas do oponente para o lado como um toureiro.",
    category: "technique"
  },
  {
    term: "Knee Cut Pass",
    termJa: "ニーカットパス",
    termPt: "Passagem Joelho",
    definition: "A guard pass cutting your knee across opponent's thigh.",
    definitionJa: "膝を相手の太ももを横切るようにするガードパス。",
    definitionPt: "Uma passagem de guarda cortando o joelho pela coxa do oponente.",
    category: "technique"
  },
  {
    term: "Long Step Pass",
    termJa: "ロングステップパス",
    termPt: "Passagem Passo Longo",
    definition: "A pass using a long stepping motion to clear the legs.",
    definitionJa: "大きなステップで足を越えるパス。",
    definitionPt: "Uma passagem usando um movimento de passo longo para passar as pernas.",
    category: "technique"
  },
  // Movements
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
    term: "Technical Stand Up",
    termJa: "テクニカルスタンドアップ",
    termPt: "Levantada Técnica",
    definition: "A safe method to stand up while maintaining base and protection.",
    definitionJa: "ベースと防御を維持しながら安全に立ち上がる方法。",
    definitionPt: "Um método seguro de levantar mantendo base e proteção.",
    category: "movement"
  },
  {
    term: "Granby Roll",
    termJa: "グランビーロール",
    termPt: "Rolamento Granby",
    definition: "A shoulder roll used for escapes and inversions.",
    definitionJa: "エスケープやインバージョンに使う肩を使った回転。",
    definitionPt: "Um rolamento de ombro usado para fugas e inversões.",
    category: "movement"
  },
  {
    term: "Inversion",
    termJa: "インバージョン",
    termPt: "Inversão",
    definition: "Going upside down to recover guard or create attacks.",
    definitionJa: "逆さまになってガードを回復したり攻撃を作る動き。",
    definitionPt: "Ficar de cabeça para baixo para recuperar guarda ou criar ataques.",
    category: "movement"
  },
  {
    term: "Pummel",
    termJa: "パメル",
    termPt: "Pummel",
    definition: "Fighting for inside position with your arms in the clinch.",
    definitionJa: "組み合いで腕の内側のポジションを争う動き。",
    definitionPt: "Lutando por posição interna com os braços no clinch.",
    category: "movement"
  },
  // Concepts
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
  },
  {
    term: "Frame",
    termJa: "フレーム",
    termPt: "Frame",
    definition: "Using your skeletal structure to create space and defend.",
    definitionJa: "骨格構造を使ってスペースを作り防御すること。",
    definitionPt: "Usar sua estrutura esquelética para criar espaço e defender.",
    category: "concept"
  },
  {
    term: "Leverage",
    termJa: "レバレッジ",
    termPt: "Alavanca",
    definition: "Using mechanical advantage to overcome strength.",
    definitionJa: "力学的優位性を使って力を克服すること。",
    definitionPt: "Usar vantagem mecânica para superar força.",
    category: "concept"
  },
  {
    term: "Timing",
    termJa: "タイミング",
    termPt: "Timing",
    definition: "Executing techniques at the optimal moment.",
    definitionJa: "最適なタイミングで技を実行すること。",
    definitionPt: "Executar técnicas no momento ideal.",
    category: "concept"
  },
  {
    term: "Hip Movement",
    termJa: "ヒップムーブメント",
    termPt: "Movimento de Quadril",
    definition: "The foundation of all Jiu-Jitsu movement and technique.",
    definitionJa: "すべての柔術の動きと技術の基盤。",
    definitionPt: "A fundação de todo movimento e técnica de Jiu-Jitsu.",
    category: "concept"
  },
  {
    term: "Grip Fighting",
    termJa: "グリップファイティング",
    termPt: "Luta de Pegadas",
    definition: "The battle for advantageous grips on your opponent.",
    definitionJa: "相手に対する有利なグリップを争うこと。",
    definitionPt: "A batalha por pegadas vantajosas no oponente.",
    category: "concept"
  },
  {
    term: "Connection",
    termJa: "コネクション",
    termPt: "Conexão",
    definition: "Maintaining contact with your opponent for control.",
    definitionJa: "コントロールのために相手との接触を維持すること。",
    definitionPt: "Manter contato com o oponente para controle.",
    category: "concept"
  },
  // Equipment
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
    term: "Rash Guard",
    termJa: "ラッシュガード",
    termPt: "Rash Guard",
    definition: "A tight-fitting athletic shirt worn for no-gi training.",
    definitionJa: "ノーギトレーニングで着用するタイトなアスレチックシャツ。",
    definitionPt: "Uma camisa atlética justa usada para treino sem kimono.",
    category: "equipment"
  },
  {
    term: "Spats",
    termJa: "スパッツ",
    termPt: "Spats",
    definition: "Compression pants worn for no-gi training.",
    definitionJa: "ノーギトレーニングで着用するコンプレッションパンツ。",
    definitionPt: "Calças de compressão usadas para treino sem kimono.",
    category: "equipment"
  },
  {
    term: "Belt",
    termJa: "帯",
    termPt: "Faixa",
    definition: "Colored belt indicating rank: white, blue, purple, brown, black.",
    definitionJa: "ランクを示す色帯：白、青、紫、茶、黒。",
    definitionPt: "Faixa colorida indicando graduação: branca, azul, roxa, marrom, preta.",
    category: "equipment"
  },
  {
    term: "Mouth Guard",
    termJa: "マウスピース",
    termPt: "Protetor Bucal",
    definition: "Protective gear for teeth during training and competition.",
    definitionJa: "トレーニングや試合中に歯を保護する道具。",
    definitionPt: "Equipamento de proteção para os dentes durante treino e competição.",
    category: "equipment"
  },
  // General
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
    term: "IBJJF",
    termJa: "IBJJF",
    termPt: "IBJJF",
    definition: "International Brazilian Jiu-Jitsu Federation, the largest BJJ organization.",
    definitionJa: "国際ブラジリアン柔術連盟。最大のBJJ組織。",
    definitionPt: "Federação Internacional de Jiu-Jitsu Brasileiro, a maior organização de BJJ.",
    category: "general"
  },
  {
    term: "SJJIF",
    termJa: "SJJIF",
    termPt: "SJJIF",
    definition: "Sport Jiu-Jitsu International Federation.",
    definitionJa: "スポーツ柔術国際連盟。",
    definitionPt: "Federação Internacional de Jiu-Jitsu Esportivo.",
    category: "general"
  },
  {
    term: "Warm Up",
    termJa: "ウォームアップ",
    termPt: "Aquecimento",
    definition: "Preparation exercises before training.",
    definitionJa: "トレーニング前の準備運動。",
    definitionPt: "Exercícios de preparação antes do treino.",
    category: "general"
  },
  {
    term: "Drilling",
    termJa: "ドリル",
    termPt: "Drill",
    definition: "Repetitive practice of techniques without resistance.",
    definitionJa: "抵抗なしでの技術の反復練習。",
    definitionPt: "Prática repetitiva de técnicas sem resistência.",
    category: "general"
  },
  {
    term: "Flow Roll",
    termJa: "フローロール",
    termPt: "Rolar Leve",
    definition: "Light sparring focusing on movement and technique over power.",
    definitionJa: "パワーより動きとテクニックに焦点を当てた軽いスパーリング。",
    definitionPt: "Sparring leve focando em movimento e técnica ao invés de força.",
    category: "general"
  },
  {
    term: "Competition",
    termJa: "試合",
    termPt: "Competição",
    definition: "Official Jiu-Jitsu tournament or match.",
    definitionJa: "公式の柔術トーナメントまたは試合。",
    definitionPt: "Torneio ou luta oficial de Jiu-Jitsu.",
    category: "general"
  },
  {
    term: "Professor",
    termJa: "先生",
    termPt: "Professor",
    definition: "A Jiu-Jitsu instructor, typically black belt.",
    definitionJa: "柔術の指導者。通常は黒帯。",
    definitionPt: "Um instrutor de Jiu-Jitsu, tipicamente faixa preta.",
    category: "general"
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

  const seoData = {
    ja: {
      title: "柔術用語集 | JiuFlow - ブラジリアン柔術",
      description: "ブラジリアン柔術の用語集。ガード、マウント、サブミッションなどBJJの基本用語を解説。"
    },
    en: {
      title: "BJJ Glossary | JiuFlow - Brazilian Jiu-Jitsu",
      description: "Brazilian Jiu-Jitsu glossary. Learn BJJ terminology including guards, mounts, submissions and more."
    },
    pt: {
      title: "Glossário de Jiu-Jitsu | JiuFlow",
      description: "Glossário de Jiu-Jitsu Brasileiro. Aprenda os termos do BJJ incluindo guardas, montadas e finalizações."
    }
  };

  const currentSeo = seoData[language] || seoData.ja;

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
      <SEOHead
        title={currentSeo.title}
        description={currentSeo.description}
        canonicalUrl="https://jiuflow.lovableproject.com/glossary"
        keywords={["BJJ用語", "柔術用語集", "グロッサリー"]}
      />
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
