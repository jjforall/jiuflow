import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const FAQ = () => {
  const { language } = useLanguage();

  const philosophyFAQs = [
    {
      question: "初心者でも内容は理解できますか？",
      answer:
        "はい。白帯の初心者でも身につけられ、かつ黒帯まで使い続けられる「ベーシックかつ本質的」なテクニックを厳選しています。実際にYAWARAやSWEEPでは、運動未経験からこのメソッドを学び、白帯で優勝された方も多数いらっしゃいますのでご安心ください。",
    },
    {
      question: "他のサービスに比べてテクニックの種類が少ないのはなぜですか？",
      answer:
        "辞書のような網羅性を目指しているのではなく、黒帯までの最短ルートを迷わず進めるよう、あえて「回り道をしないための技」に絞って掲載しているためです。もちろん、今後もコンテンツの追加やブラッシュアップは継続していきます。",
    },
    {
      question: "テクニックは今後増えますか？",
      answer: "はい。毎月新しいテクニック動画を更新していく予定です。",
    },
    {
      question: "道着（Gi）とノーギ（No-Gi）どちらのテクニックが多いですか？",
      answer: "現在は道着（Gi）のテクニックがメインとなっています。",
    },
    {
      question: "やってほしいテクニックのリクエストはできますか？",
      answer: "ぜひお聞かせください。お問い合わせフォームよりリクエストを受け付けております。",
      hasLink: true,
    },
  ];

  const accountFAQs = [
    {
      question: "支払いのカード情報を変えるには？",
      answer:
        "マイページの「プラン情報」セクションにある「支払いカード情報を変更」ボタンをクリックすると、Stripe社のLink決済管理ポータルが開きます。そちらでカード情報の更新や変更が可能です。",
      hasLink: true,
      linkTo: "/mypage",
      linkText: "→ マイページはこちら",
    },
    {
      question: "サブスクリプションを解約したい（退会方法を教えてください）",
      answer:
        "以下の手順でいつでもご自身で解約が可能です。\n\n① マイページにアクセス\n② ページ下部の「設定」タブをクリック\n③ プラン情報のセクションを確認\n④ 「プランを解約する」ボタンをクリック\n\n※ 解約後も、現在の有効期限（次回請求予定日）までは引き続き動画をご視聴いただけます。",
      hasLink: true,
      linkTo: "/mypage",
      linkText: "→ マイページはこちら",
    },
  ];

  const featureFAQs = [
    {
      question: "動画を見ただけで強くなれますか？おすすめの学習方法は？",
      answer:
        "動画で論理を理解し、道場での練習で実践するのが最短の近道です。ブックマーク機能を使い、練習直前にスマホでテーマを確認してからマットに上がるスタイルをおすすめしています。",
    },
    {
      question: "「練習記録」機能はどう使えばいいですか？",
      answer:
        "視聴した動画の感想や、スパーリングでの気づきをメモとして残せます。言語化することで技術の定着率が高まります。自分だけの「デジタル柔術ノート」としてご活用ください。",
    },
    {
      question: "スマホアプリはありますか？",
      answer:
        "現在はWebブラウザ版のみですが、スマートフォンのホーム画面に「ショートカット」として追加することで、アプリのようにご利用いただけます。",
    },
  ];

  return (
    <>
      <SEOHead
        title="よくあるご質問 | JiuFlow"
        description="JiuFlowに関するよくあるご質問と回答をまとめています。サービスの内容、機能、活用方法についてご確認いただけます。"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            よくあるご質問
          </h1>

          {/* Philosophy & Content Section */}
          <section className="mb-10">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 border-l-4 border-primary pl-3">
              JiuFlowの哲学・コンテンツについて
            </h2>
            <Accordion type="multiple" className="w-full">
              {philosophyFAQs.map((faq, index) => (
                <AccordionItem key={index} value={`philosophy-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base text-foreground hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                    {faq.hasLink && (
                      <Link
                        to="/contact"
                        className="block mt-2 text-primary hover:underline"
                      >
                        → お問い合わせフォームはこちら
                      </Link>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Features & Usage Section */}
          <section className="mb-10">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 border-l-4 border-primary pl-3">
              機能・活用法について
            </h2>
            <Accordion type="multiple" className="w-full">
              {featureFAQs.map((faq, index) => (
                <AccordionItem key={index} value={`feature-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base text-foreground hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Account & Payment Section */}
          <section className="mb-10">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 border-l-4 border-primary pl-3">
              アカウント・お支払いについて
            </h2>
            <Accordion type="multiple" className="w-full">
              {accountFAQs.map((faq, index) => (
                <AccordionItem key={index} value={`account-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base text-foreground hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {faq.answer}
                    {faq.hasLink && faq.linkTo && (
                      <Link
                        to={faq.linkTo}
                        className="block mt-2 text-primary hover:underline"
                      >
                        {faq.linkText}
                      </Link>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Contact CTA */}
          <div className="text-center pt-6 border-t border-border">
            <p className="text-muted-foreground mb-4">
              その他ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              お問い合わせ
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default FAQ;
