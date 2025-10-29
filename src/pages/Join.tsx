import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Join = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic here
    console.log("Email submitted:", email);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">Join</h1>
            <p className="text-xl text-muted-foreground font-light">
              まずは「見る」から始めよう。
            </p>
          </div>

          {/* Pricing */}
          <div className="grid md:grid-cols-2 gap-8 mb-16 animate-fade-up">
            {/* Free Trial */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-light mb-4">無料体験</h2>
              <div className="text-4xl font-light mb-6">
                ¥0<span className="text-lg text-muted-foreground">/7日間</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                <li>• すべての技を閲覧可能</li>
                <li>• 4K映像で学習</li>
                <li>• 技マップへのアクセス</li>
              </ul>
              <Button variant="outline" className="w-full" size="lg">
                無料で始める
              </Button>
            </div>

            {/* Monthly */}
            <div className="border border-foreground p-8 relative">
              <div className="absolute top-0 right-0 bg-foreground text-background px-4 py-1 text-xs">
                推奨
              </div>
              <h2 className="text-2xl font-light mb-4">月額プラン</h2>
              <div className="text-4xl font-light mb-6">
                ¥1,200<span className="text-lg text-muted-foreground">/月</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                <li>• すべての技を解放</li>
                <li>• 新しい技の追加通知</li>
                <li>• 優先サポート</li>
              </ul>
              <Button variant="default" className="w-full" size="lg">
                今すぐ登録
              </Button>
            </div>
          </div>

          {/* Email Form */}
          <div className="border border-border p-8 animate-fade-up">
            <h3 className="text-2xl font-light mb-4 text-center">
              アップデートを受け取る
            </h3>
            <p className="text-muted-foreground font-light text-center mb-6">
              新しい技の追加や、サービスの最新情報をお届けします。
            </p>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" variant="default">
                登録
              </Button>
            </form>
          </div>

          {/* FAQ */}
          <div className="mt-16 animate-fade-up">
            <h3 className="text-2xl font-light mb-8 text-center border-b border-border pb-4">
              よくある質問
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-light mb-2">いつでも解約できますか？</h4>
                <p className="text-muted-foreground font-light text-sm">
                  はい。いつでも解約可能です。解約後も契約期間内はコンテンツにアクセスできます。
                </p>
              </div>
              <div>
                <h4 className="font-light mb-2">支払い方法は？</h4>
                <p className="text-muted-foreground font-light text-sm">
                  クレジットカード（Visa、Mastercard、JCB、American Express）に対応しています。
                </p>
              </div>
              <div>
                <h4 className="font-light mb-2">技は定期的に追加されますか？</h4>
                <p className="text-muted-foreground font-light text-sm">
                  はい。毎月新しい技を追加予定です。追加時にはメールでお知らせします。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Join;
