import Navigation from "@/components/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";

const About = () => {
  const { language } = useLanguage();
  const t = translations[language];

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

          {/* Team Roles */}
          <div className="mb-20 animate-fade-up">
            <h2 className="text-3xl font-light mb-8 text-center border-b border-border pb-4">
              {t.about.teamTitle}
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {t.about.teamRoles.map((role, index) => (
                <div
                  key={index}
                  className="border border-border p-6 transition-smooth hover:bg-muted"
                >
                  <p className="font-light text-foreground">{role}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center font-light">
              {t.about.teamNote}
            </p>
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
        </div>
      </main>
    </div>
  );
};

export default About;
