import Navigation from "@/components/Navigation";

const team = [
  {
    name: "良蔵 Ryozo",
    role: "Instructor",
    description: "技術の体系化と指導",
  },
  {
    name: "あい Ai",
    role: "Director",
    description: "映像制作とディレクション",
  },
  {
    name: "濱田 Yuki",
    role: "Producer",
    description: "プロジェクト全体の統括",
  },
  {
    name: "野島 Nojima",
    role: "System",
    description: "システム開発と技術基盤",
  },
];

const About = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">About</h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              柔術を、映像で体系化する。<br />
              それが私たちのミッション。
            </p>
          </div>

          <div className="mb-20 animate-fade-up">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg font-light text-muted-foreground leading-relaxed mb-6">
                Brotherhood Jiu-Jitsu、JYU LAB、ROLL BASE。
              </p>
              <p className="text-lg font-light text-muted-foreground leading-relaxed mb-6">
                私たちは柔術の技術を、映像という形で体系化し、<br />
                誰もが理解しやすい形で提供することを目指しています。
              </p>
              <p className="text-lg font-light text-muted-foreground leading-relaxed">
                上面からの4K映像、明確な技の流れ、<br />
                そして一つひとつの動きに込められた意味。<br />
                それらを通じて、柔術の本質を伝えていきます。
              </p>
            </div>
          </div>

          {/* Team */}
          <div className="animate-fade-up">
            <h2 className="text-3xl font-light mb-12 text-center border-b border-border pb-4">
              Team
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
                    {member.description}
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
