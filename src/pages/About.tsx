import Navigation from "@/components/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";

const team = [
  { name: "良蔵 Ryozo", role: "Instructor", roleKey: "instructor" },
  { name: "あい Ai", role: "Director", roleKey: "director" },
  { name: "濱田 Yuki", role: "Producer", roleKey: "producer" },
  { name: "野島 Nojima", role: "System", roleKey: "system" },
];

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

          <div className="mb-20 animate-fade-up">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg font-light text-muted-foreground leading-relaxed mb-6">
                {t.about.intro1}
              </p>
              <p className="text-lg font-light text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
                {t.about.intro2}
              </p>
              <p className="text-lg font-light text-muted-foreground leading-relaxed whitespace-pre-line">
                {t.about.intro3}
              </p>
            </div>
          </div>

          {/* Team */}
          <div className="animate-fade-up">
            <h2 className="text-3xl font-light mb-12 text-center border-b border-border pb-4">
              {t.about.team}
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="border border-border p-8 transition-smooth hover:bg-muted"
                >
                  <h3 className="text-2xl font-light mb-2">{member.name}</h3>
                  <div className="text-sm text-accent mb-4">{member.role}</div>
                  <p className="font-light text-muted-foreground">
                    {t.about.roles[member.roleKey as keyof typeof t.about.roles]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
