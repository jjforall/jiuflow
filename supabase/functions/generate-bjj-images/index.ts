import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageType, index } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not set");
    }

    // BJJテーマの画像プロンプト
    const prompts: Record<string, string> = {
      hero1: "Professional Brazilian Jiu-Jitsu training scene in a modern dojo, two athletes in white and blue gi practicing techniques, dramatic lighting, cinematic composition, high quality photography, 16:9 aspect ratio",
      hero2: "BJJ black belt instructor demonstrating a guard pass technique to students, clean modern gym environment, motivational atmosphere, professional sports photography, wide angle, 16:9 format",
      hero3: "Close-up of BJJ practitioner tying their belt, hands in focus showing dedication and discipline, shallow depth of field, inspirational mood, high resolution, 16:9 composition",
      hero4: "Brazilian Jiu-Jitsu competition scene, two athletes engaged in technical grappling match, referee in background, professional sports photography, dynamic action, 16:9 aspect ratio",
      hero5: "BJJ training group doing warm-up exercises in a bright modern dojo, diverse practitioners of different belt levels, team spirit, wide shot, professional photography, 16:9 format",
      hero6: "Elegant minimalist shot of a folded BJJ gi with colored belt on wooden floor, natural lighting, zen aesthetic, product photography style, 16:9 composition",
      hero7: "BJJ practitioners studying techniques from a textbook or tablet together, learning atmosphere, modern training facility, collaborative spirit, 16:9 professional photography",
      hero8: "Aerial view of BJJ practitioners on the mat forming a circle during class, geometric composition, birds eye perspective, professional photography, 16:9 aspect ratio",
      cover1: "Abstract Brazilian Jiu-Jitsu themed cover image with flowing gi fabric and belt, elegant gradient background, modern design, professional quality, 16:5 ultra wide format",
      cover2: "Minimalist BJJ themed background with subtle texture, professional gradient, perfect for profile cover photo, modern aesthetic, 16:5 ultra wide aspect ratio",
    };

    const prompt = prompts[imageType] || prompts.hero1;

    console.log("Generating image with prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Upload to storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Convert base64 to blob
    const base64Data = imageUrl.split(",")[1];
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    const fileName = `${imageType}-${index || Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`generated/${fileName}`, binaryData, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(`generated/${fileName}`);

    console.log("Image generated and uploaded successfully:", publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        base64: imageUrl 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
