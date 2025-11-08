import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

const About = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate content loading
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="animate-fade-in space-y-20">
              <div className="text-center space-y-6">
                <Skeleton className="h-16 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-10 w-1/3 mx-auto" />
                <div className="border border-border p-8 space-y-4">
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
