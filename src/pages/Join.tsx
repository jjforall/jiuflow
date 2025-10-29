import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Stripe price IDs
const PRICE_IDS = {
  founder: "price_1SNQoODqLakc8NxkYIcIaWg2",
  monthly: "price_1SNQoeDqLakc8NxkEUVTTs3k",
  annual: "price_1SNQoqDqLakc8NxkOaQIL8wX",
};

// Sample video ID
const SAMPLE_VIDEO_ID = "6a70670c-e9f8-4a8b-adce-8e703ac56bee";

const Join = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Check for payment status in URL
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: t.join.payment?.success || "Payment successful!",
        description: t.join.payment?.successDesc || "Thank you for your purchase.",
      });
    } else if (searchParams.get("canceled") === "true") {
      toast({
        title: t.join.payment?.canceled || "Payment canceled",
        description: t.join.payment?.canceledDesc || "Your payment was canceled.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, t.join.payment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
  };

  const handleCheckout = async (priceId: string, isSubscription: boolean) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t.join.payment?.loginRequired || "Login required",
          description: t.join.payment?.loginRequiredDesc || "Please login to continue with payment.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const functionName = isSubscription ? "create-checkout" : "create-payment";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: t.join.payment?.error || "Payment error",
        description: t.join.payment?.errorDesc || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-light mb-6">{t.join.title}</h1>
            <p className="text-xl text-muted-foreground font-light">
              {t.join.subtitle}
            </p>
          </div>

          {/* Sample Video Section */}
          <div className="border border-border p-8 mb-16 animate-fade-up text-center">
            <h2 className="text-2xl font-light mb-4">{t.join.sampleVideo.title}</h2>
            <Button variant="outline" size="lg" onClick={() => setShowVideoModal(true)}>
              {t.join.sampleVideo.cta}
            </Button>
          </div>

          {/* Video Modal */}
          <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{t.join.sampleVideo.title}</DialogTitle>
              </DialogHeader>
              <div className="aspect-video">
                <iframe
                  src={`https://jkiohqfamhiykurxrhsn.supabase.co/storage/v1/object/public/technique-videos/${SAMPLE_VIDEO_ID}.mp4`}
                  className="w-full h-full"
                  allowFullScreen
                  title="Sample Video"
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Pricing */}
          <div className="grid md:grid-cols-3 gap-8 mb-16 animate-fade-up">
            {/* Founder Plan */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-light mb-4">{t.join.founder?.title || "Founder Plan"}</h2>
              <div className="text-4xl font-light mb-6">
                ¥500<span className="text-lg text-muted-foreground">{t.join.founder?.period || "/month lifetime"}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t.join.founder?.limited || "Limited to first 100 users"}</p>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {(t.join.founder?.features || [
                  "Unlimited access",
                  "Lifetime ¥500/month",
                  "Better than one-time"
                ]).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(PRICE_IDS.founder, false)}
                disabled={isLoading}
              >
                {t.join.founder?.cta || "Get Founder Access"}
              </Button>
            </div>

            {/* Monthly */}
            <div className="border border-foreground p-8 relative">
              <div className="absolute top-0 right-0 bg-foreground text-background px-4 py-1 text-xs">
                {t.join.monthly.recommended}
              </div>
              <h2 className="text-2xl font-light mb-4">{t.join.monthly.title}</h2>
              <div className="text-4xl font-light mb-6">
                {t.join.monthly.price}<span className="text-lg text-muted-foreground">{t.join.monthly.period}</span>
              </div>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {t.join.monthly.features.map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button 
                variant="default" 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(PRICE_IDS.monthly, true)}
                disabled={isLoading}
              >
                {t.join.monthly.cta}
              </Button>
            </div>

            {/* Annual */}
            <div className="border border-border p-8">
              <h2 className="text-2xl font-light mb-4">{t.join.annual?.title || "Annual Plan"}</h2>
              <div className="text-4xl font-light mb-6">
                ¥29,000<span className="text-lg text-muted-foreground">{t.join.annual?.period || "/year"}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t.join.annual?.savings || "Save 17% vs monthly"}</p>
              <ul className="space-y-3 mb-8 text-muted-foreground font-light">
                {(t.join.annual?.features || [
                  "All monthly features",
                  "Annual billing",
                  "Best value"
                ]).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => handleCheckout(PRICE_IDS.annual, true)}
                disabled={isLoading}
              >
                {t.join.annual?.cta || "Subscribe Annually"}
              </Button>
            </div>
          </div>

          {/* Email Form */}
          <div className="border border-border p-8 animate-fade-up">
            <h3 className="text-2xl font-light mb-4 text-center">
              {t.join.newsletter.title}
            </h3>
            <p className="text-muted-foreground font-light text-center mb-6">
              {t.join.newsletter.desc}
            </p>
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Input
                type="email"
                placeholder={t.join.newsletter.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" variant="default">
                {t.join.newsletter.cta}
              </Button>
            </form>
          </div>

          {/* FAQ */}
          <div className="mt-16 animate-fade-up">
            <h3 className="text-2xl font-light mb-8 text-center border-b border-border pb-4">
              {t.join.faq.title}
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-light mb-2">{t.join.faq.q1.q}</h4>
                <p className="text-muted-foreground font-light text-sm">
                  {t.join.faq.q1.a}
                </p>
              </div>
              <div>
                <h4 className="font-light mb-2">{t.join.faq.q2.q}</h4>
                <p className="text-muted-foreground font-light text-sm">
                  {t.join.faq.q2.a}
                </p>
              </div>
              <div>
                <h4 className="font-light mb-2">{t.join.faq.q3.q}</h4>
                <p className="text-muted-foreground font-light text-sm">
                  {t.join.faq.q3.a}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Join;
