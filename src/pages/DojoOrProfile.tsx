import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Dojo from "./Dojo";
import UserProfile from "./UserProfile";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

/**
 * This component handles the ambiguous route /:slugOrUsername
 * It determines whether the parameter is a dojo slug or a username
 * and renders the appropriate component
 */
export default function DojoOrProfile() {
  const params = useParams<{ slugOrUsername?: string; lang?: string }>();
  const location = useLocation();
  
  // Get the identifier from either slugOrUsername or lang param (when accessed via /:lang route)
  const slugOrUsername = params.slugOrUsername || params.lang;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDojo, setIsDojo] = useState<boolean | null>(null);

  useEffect(() => {
    checkIfDojo();
  }, [slugOrUsername]);

  const checkIfDojo = async () => {
    if (!slugOrUsername) {
      setIsLoading(false);
      return;
    }

    try {
      // First try to find a dojo with this slug
      const { data: dojoData, error: dojoError } = await supabase
        .from('dojos')
        .select('id')
        .eq('slug', slugOrUsername)
        .maybeSingle();

      if (dojoError) {
        console.error('Error checking dojo:', dojoError);
      }

      if (dojoData) {
        setIsDojo(true);
        setIsLoading(false);
        return;
      }

      // Then try to find a celebrity with this user_id
      const { data: celebrityData, error: celebrityError } = await supabase
        .from('celebrities')
        .select('id')
        .eq('user_id', slugOrUsername)
        .maybeSingle();

      if (celebrityError) {
        console.error('Error checking celebrity:', celebrityError);
      }

      if (celebrityData) {
        // Redirect to athlete page
        window.location.href = `/athlete/${slugOrUsername}`;
        return;
      }

      // If not found as dojo slug or celebrity, assume it's a username
      setIsDojo(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in checkIfDojo:', error);
      setIsDojo(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow pt-20 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="animate-pulse space-y-6">
              <div className="h-64 bg-muted rounded" />
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isDojo) {
    return <Dojo />;
  }

  return <UserProfile />;
}
