import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not set");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trackId, title, artist } = await req.json();

    // Generate a unique prompt based on track info
    const prompts = [
      `Abstract music album cover art with flowing waves of sound, deep blues and purples, modern minimalist design, high quality digital art`,
      `Geometric music album cover with golden ratio patterns, warm earth tones, professional album artwork style`,
      `Atmospheric music cover art with gradient sunset colors, abstract shapes floating in space, dreamy aesthetic`,
      `Dynamic music album cover with interweaving lines of light, neon accents on dark background, electronic music vibe`,
      `Organic music cover art with natural textures, soft pastels and earth tones, zen meditation feel`,
    ];

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const finalPrompt = artist 
      ? `${randomPrompt}. Style inspired by ${artist}. Title: ${title}`
      : `${randomPrompt}. Title: ${title}`;

    console.log("Generating cover with prompt:", finalPrompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: finalPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Convert base64 to blob and upload to storage
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `music-covers/${trackId}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Update the track with the new thumbnail
    const { error: updateError } = await supabase
      .from("music_tracks")
      .update({ thumbnail_url: publicUrl })
      .eq("id", trackId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update track: ${updateError.message}`);
    }

    console.log("Successfully generated and saved cover:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, thumbnailUrl: publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
