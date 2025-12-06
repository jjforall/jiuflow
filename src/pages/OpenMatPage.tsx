import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { OpenMat } from "@/components/OpenMat";

const OpenMatPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw]">
      <Navigation />
      <main className="pt-24 pb-16 w-full max-w-[100vw]">
        <div className="w-full">
          <OpenMat />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OpenMatPage;
