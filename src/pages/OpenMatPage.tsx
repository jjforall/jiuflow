import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { OpenMat } from "@/components/OpenMat";

const OpenMatPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation />
      <main className="pt-20 pb-16 w-full overflow-hidden">
        <OpenMat />
      </main>
      <Footer />
    </div>
  );
};

export default OpenMatPage;
