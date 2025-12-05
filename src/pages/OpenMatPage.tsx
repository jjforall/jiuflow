import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { OpenMat } from "@/components/OpenMat";

const OpenMatPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <OpenMat />
      </main>
      <Footer />
    </div>
  );
};

export default OpenMatPage;
