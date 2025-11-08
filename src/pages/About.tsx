import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const About = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">{t.about.title}</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto whitespace-pre-line">
              {t.about.subtitle}
            </p>
          </div>

          {/* Mission */}
          <div className="mb-20 animate-fade-up">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg font-light text-muted-foreground leading-relaxed whitespace-pre-line">
                {t.about.mission}
              </p>
            </div>
          </div>

          {/* Instructor */}
          <div className="animate-fade-up">
            <h2 className="text-3xl font-light mb-8 text-center border-b border-border pb-4">
              {t.about.instructorTitle}
            </h2>
            <div className="border border-border p-8">
              <h3 className="text-3xl font-light mb-6 text-center">{t.about.instructor.name}</h3>
              <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                <p>{t.about.instructor.birth}</p>
                <p>{t.about.instructor.achievement1}</p>
                <p>{t.about.instructor.achievement2}</p>
                <p>{t.about.instructor.philosophy}</p>
                <p>{t.about.instructor.approach}</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center animate-fade-up">
            <div className="border border-border p-12 bg-muted/30">
              <h2 className="text-3xl font-light mb-6">始めてみませんか？</h2>
              <p className="text-muted-foreground mb-8 font-light">
                柔術を、体系的に。静かに、深く学ぶ。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/join")}
                  className="font-light"
                >
                  プランを見る
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate("/login")}
                  className="font-light"
                >
                  今すぐ始める
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
