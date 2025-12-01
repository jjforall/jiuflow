import { ContactForm } from "@/components/ContactForm";
import { useTranslation } from "@/hooks/useTranslation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Contact = () => {
  const { language } = useTranslation();

  const pageTitle = language === "ja" ? "お問い合わせ" : language === "pt" ? "Contato" : "Contact";
  const description = language === "ja" 
    ? "お問い合わせ、新しい技の共有、ご提案などがございましたら、お気軽にご連絡ください。"
    : language === "pt"
    ? "Se você tiver dúvidas, compartilhar novas técnicas ou sugestões, sinta-se à vontade para entrar em contato."
    : "If you have any questions, wish to share new techniques, or have suggestions, please feel free to contact us.";

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow pt-20 pb-16">
        <div className="container max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-5xl md:text-6xl font-light mb-6">{pageTitle}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                ✉️ {description}
              </p>
            </div>

            <div className="border border-border p-8 bg-card rounded-lg shadow-sm">
              <ContactForm />
            </div>

            <Separator className="my-12" />

            {/* 特定商取引法に基づく表記 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-light">
                  {language === "ja" 
                    ? "特定商取引法に基づく表記" 
                    : language === "pt"
                    ? "Informações Legais da Transação"
                    : "Legal Transaction Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "販売事業者名" : language === "pt" ? "Nome do Vendedor" : "Seller Name"}
                    </h3>
                    <p className="text-muted-foreground">jiuflow</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "運営統括責任者" : language === "pt" ? "Responsável pela Operação" : "Chief Operating Officer"}
                    </h3>
                    <p className="text-muted-foreground">jiuflow運営チーム</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "所在地" : language === "pt" ? "Endereço" : "Address"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "東京都" 
                        : language === "pt"
                        ? "Tóquio, Japão"
                        : "Tokyo, Japan"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "お問い合わせ" : language === "pt" ? "Contato" : "Contact"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "上記のお問い合わせフォームよりご連絡ください" 
                        : language === "pt"
                        ? "Entre em contato através do formulário acima"
                        : "Please contact us using the form above"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "販売価格" : language === "pt" ? "Preço de Venda" : "Sales Price"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "各サービスページに記載の価格（消費税込み）" 
                        : language === "pt"
                        ? "Preço indicado em cada página de serviço (incluindo impostos)"
                        : "Price indicated on each service page (including tax)"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "商品代金以外の必要料金" : language === "pt" ? "Outras Taxas Necessárias" : "Other Required Fees"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "インターネット接続料金、通信料金等はお客様のご負担となります" 
                        : language === "pt"
                        ? "Taxas de conexão à internet e comunicação são de responsabilidade do cliente"
                        : "Internet connection and communication fees are the customer's responsibility"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "支払方法" : language === "pt" ? "Método de Pagamento" : "Payment Method"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "クレジットカード決済（Stripe）" 
                        : language === "pt"
                        ? "Pagamento com cartão de crédito (Stripe)"
                        : "Credit card payment (Stripe)"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "支払時期" : language === "pt" ? "Período de Pagamento" : "Payment Timing"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "クレジットカード決済の場合、カード会社の規約に基づきます" 
                        : language === "pt"
                        ? "Para pagamento com cartão de crédito, de acordo com os termos da operadora do cartão"
                        : "For credit card payments, according to the card company's terms"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "サービスの提供時期" : language === "pt" ? "Período de Fornecimento do Serviço" : "Service Provision Period"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "決済完了後、即時ご利用いただけます" 
                        : language === "pt"
                        ? "Disponível imediatamente após a conclusão do pagamento"
                        : "Available immediately after payment completion"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "返品・キャンセルについて" : language === "pt" ? "Sobre Devolução e Cancelamento" : "Returns and Cancellations"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "デジタルコンテンツという商品の性質上、原則として返品・返金はお受けできません。ただし、サービスに不具合がある場合は、お問い合わせフォームよりご連絡ください。" 
                        : language === "pt"
                        ? "Devido à natureza do conteúdo digital, em princípio não aceitamos devoluções ou reembolsos. No entanto, se houver algum problema com o serviço, entre em contato através do formulário."
                        : "Due to the nature of digital content, we generally do not accept returns or refunds. However, if there are issues with the service, please contact us through the form."}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      {language === "ja" ? "サブスクリプションの解約" : language === "pt" ? "Cancelamento de Assinatura" : "Subscription Cancellation"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "ja" 
                        ? "マイページからいつでも解約可能です。解約後も、次回更新日までサービスをご利用いただけます。" 
                        : language === "pt"
                        ? "Pode cancelar a qualquer momento através da página Minha Conta. Após o cancelamento, você pode continuar usando o serviço até a próxima data de renovação."
                        : "You can cancel anytime from My Page. After cancellation, you can continue using the service until the next renewal date."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
