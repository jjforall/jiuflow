import { ContactForm } from "@/components/ContactForm";
import { useTranslation } from "@/hooks/useTranslation";

const Contact = () => {
  const { language } = useTranslation();

  const pageTitle = language === "ja" ? "お問い合わせ" : language === "pt" ? "Contato" : "Contact";
  const description = language === "ja" 
    ? "お問い合わせ、新しい技の共有、ご提案などがございましたら、お気軽にご連絡ください。"
    : language === "pt"
    ? "Se você tiver dúvidas, compartilhar novas técnicas ou sugestões, sinta-se à vontade para entrar em contato."
    : "If you have any questions, wish to share new techniques, or have suggestions, please feel free to contact us.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-light mb-6">{pageTitle}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              ✉️ {description}
            </p>
          </div>

          <div className="border border-border p-8 bg-card rounded-lg shadow-sm">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
