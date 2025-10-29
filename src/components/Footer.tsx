import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-light mb-4">jiuflow</h3>
            <p className="text-sm text-muted-foreground font-light">
              {language === "ja" && "柔術を、体系で学ぶ。"}
              {language === "en" && "Learn Jiu-Jitsu Systematically."}
              {language === "pt" && "Aprenda Jiu-Jitsu Sistematicamente."}
            </p>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/map" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Map
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-smooth">
                  About
                </Link>
              </li>
              <li>
                <Link to="/join" className="text-muted-foreground hover:text-foreground transition-smooth">
                  Join
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: info@bjj.example</li>
              <li>Instagram: @brotherhoodbjj</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-light mb-4 text-sm">Admin</h4>
            <Link 
              to="/admin" 
              className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
            >
              {language === "ja" && "管理画面"}
              {language === "en" && "Admin Panel"}
              {language === "pt" && "Painel Admin"}
            </Link>
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
