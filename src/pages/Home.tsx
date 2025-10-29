import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { useHeroImages } from "@/hooks/useHeroImages";
import Footer from "@/components/Footer";

const Home = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const { images, isLoading, currentIndex, totalImages } = useHeroImages();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          {/* Background Image/Video */}
          <div className="absolute inset-0 bg-muted">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">🥋</div>
                  <p className="text-sm">Loading...</p>
                </div>
              </div>
            ) : images.length > 0 ? (
              <>
                {/* Multiple images overlaid with fade transitions */}
                {images.map((image, idx) => (
                  <div
                    key={image.id}
                    className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                    style={{ opacity: idx === currentIndex ? 1 : 0 }}
                  >
                    <img 
                      src={image.url} 
                      alt={`Jiu-Jitsu Training ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
                
                {/* Image indicators */}
                {totalImages > 1 && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {Array.from({ length: totalImages }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 transition-all duration-300 ${
                          idx === currentIndex 
                            ? 'w-8 bg-white' 
                            : 'w-1 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-6xl mb-4">🥋</div>
                  <p className="text-sm">4K Overhead View</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-up">
            <h1 className="text-6xl md:text-8xl font-light mb-6 tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {t.home.hero.title}
            </h1>
            <p className="text-xl md:text-2xl font-light mb-12 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-pre-line">
              {t.home.hero.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/map">
                <Button variant="default" size="lg" className="min-w-[200px]">
                  {t.home.hero.viewMap}
                </Button>
              </Link>
              <Link to="/join">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  {t.home.hero.freeTrial}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Learn with Clarity Section */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-light mb-6">
                {t.home.clarity.title}
              </h2>
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto whitespace-pre-line">
                {t.home.clarity.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <span className="text-2xl">📹</span>
                </div>
                <h3 className="text-xl font-light mb-3">{t.home.clarity.overhead.title}</h3>
                <p className="text-muted-foreground font-light whitespace-pre-line">
                  {t.home.clarity.overhead.desc}
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-xl font-light mb-3">{t.home.clarity.systematic.title}</h3>
                <p className="text-muted-foreground font-light whitespace-pre-line">
                  {t.home.clarity.systematic.desc}
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-light mb-3">{t.home.clarity.focused.title}</h3>
                <p className="text-muted-foreground font-light whitespace-pre-line">
                  {t.home.clarity.focused.desc}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
