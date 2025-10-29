import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Link } from "react-router-dom";

const Join = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">{t.join.title}</h1>
            <p className="text-xl text-muted-foreground font-light">
              {t.join.subtitle}
            </p>
          </div>

          {/* Sample Video Section */}
          <div className="border border-border p-8 mb-16 animate-fade-up text-center">
            <h2 className="text-2xl font-light mb-4">{t.join.sampleVideo.title}</h2>
            <Link to="/video/6a70670c-e9f8-4a8b-adce-8e703ac56bee">
              <Button variant="outline" size="lg">
                {t.join.sampleVideo.cta}
              </Button>
            </Link>
          </div>

          {/* Pricing */}
          <div className="grid md:grid-cols-2 gap-8 mb-16 animate-fade-up">
            {/* Free Trial */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-light mb-4">{t.join.free.title}</h2>
              <div className="text-4xl font-light mb-6">
                {t.join.free.price}<span className="text-lg text-muted-foreground">{t.join.free.period}</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {t.join.free.features.map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" size="lg">
                {t.join.free.cta}
              </Button>
            </div>

            {/* Monthly */}
            <div className="border border-foreground p-8 relative">
              <div className="absolute top-0 right-0 bg-foreground text-background px-4 py-1 text-xs">
                {t.join.monthly.recommended}
              </div>
              <h2 className="text-2xl font-light mb-4">{t.join.monthly.title}</h2>
              <div className="text-4xl font-light mb-6">
                {t.join.monthly.price}<span className="text-lg text-muted-foreground">{t.join.monthly.period}</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {t.join.monthly.features.map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button variant="default" className="w-full" size="lg">
                {t.join.monthly.cta}
              </Button>
            </div>
          </div>

          {/* Email Form */}
          <div className="border border-border p-8 animate-fade-up">
            <h3 className="text-2xl font-light mb-4 text-center">
              {t.join.newsletter.title}
            </h3>
            <p className="text-muted-foreground font-light text-center mb-6">
              {t.join.newsletter.desc}
            </p>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Input
                type="email"
                placeholder={t.join.newsletter.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" variant="default">
                {t.join.newsletter.cta}
              </Button>
            </form>
          </div>

          {/* FAQ */}
          <div className="mt-16 animate-fade-up">
            <h3 className="text-2xl font-light mb-8 text-center border-b border-border pb-4">
              {t.join.faq.title}
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-light mb-2">{t.join.faq.q1.q}</h4>
                <p className="text-muted-foreground font-light text-sm">
                  {t.join.faq.q1.a}
                </p>
              </div>
              <div>
                <h4 className="font-light mb-2">{t.join.faq.q2.q}</h4>
                <p className="text-muted-foreground font-light text-sm">
                  {t.join.faq.q2.a}
                </p>
              </div>
              <div>
                <h4 className="font-light mb-2">{t.join.faq.q3.q}</h4>
                <p className="text-muted-foreground font-light text-sm">
                  {t.join.faq.q3.a}
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
