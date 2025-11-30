import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-light mb-4">jiuflow</h3>
            <p className="text-sm text-muted-foreground font-light">
              {t("home.hero.subtitle", "Learn Jiu-Jitsu Systematically.")}
            </p>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.home", "Home")}
                </Link>
              </li>
              <li>
                <Link to="/map" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.map", "Map")}
                </Link>
              </li>
              <li>
                <Link to="/dojos" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.dojos", "Dojos")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.about", "About")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.contact", "Contact")}
                </Link>
              </li>
              <li>
                <Link to="/join" className="text-muted-foreground hover:text-foreground transition-smooth">
                  {t("nav.join", "Join")}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Social</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://instagram.com/jiuFlowArt" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-muted-foreground hover:text-foreground transition-smooth"
                >
                  Instagram: @jiuFlowArt
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2025 jiuflow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
