import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";

const Home = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-muted">
            {/* Placeholder for video - will be replaced with actual video */}
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-6xl mb-4">🥋</div>
                <p className="text-sm">4K Overhead View</p>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-up">
            <h1 className="text-6xl md:text-8xl font-light mb-6 tracking-tight">
              From Pull to Submission.
            </h1>
            <p className="text-xl md:text-2xl font-light mb-12 text-muted-foreground">
              柔術を、体系で学ぶ。
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/map">
                <Button variant="default" size="lg" className="min-w-[200px]">
                  技マップを見る
                </Button>
              </Link>
              <Link to="/join">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  無料で体験する
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
                Learn Jiu-Jitsu with Clarity.
              </h2>
              <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
                動きの意味を「見える化」する。<br />
                一つひとつの技を、静かに深く学ぶ。
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <span className="text-2xl">📹</span>
                </div>
                <h3 className="text-xl font-light mb-3">4K Overhead View</h3>
                <p className="text-muted-foreground font-light">
                  上面からの撮影で、<br />動きの全体像を把握。
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-xl font-light mb-3">Systematic Map</h3>
                <p className="text-muted-foreground font-light">
                  技の体系を一枚で表現。<br />流れで理解する。
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-light mb-3">Focused Learning</h3>
                <p className="text-muted-foreground font-light">
                  一つひとつの技に集中。<br />深く、静かに学ぶ。
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
