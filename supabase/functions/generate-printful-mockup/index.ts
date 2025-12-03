import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MockupRequest {
  product_id: number;
  variant_ids: number[];
  format: string;
  files: Array<{
    placement: string;
    image_url: string;
    position: {
      area_width: number;
      area_height: number;
      width: number;
      height: number;
      top: number;
      left: number;
    };
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");
    if (!PRINTFUL_API_KEY) {
      throw new Error("PRINTFUL_API_KEY is not set");
    }

    const body: MockupRequest = await req.json();
    console.log("[GENERATE-MOCKUP] Creating mockup task:", JSON.stringify(body));

    const productId = body.product_id;
    if (!productId) {
      throw new Error("product_id is required");
    }

    // Step 1: Get printfiles info for the product to know placement dimensions
    const printfilesResponse = await fetch(
      `https://api.printful.com/mockup-generator/printfiles/${productId}`,
      {
        headers: {
          "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
        },
      }
    );

    if (!printfilesResponse.ok) {
      const errorText = await printfilesResponse.text();
      console.error("[GENERATE-MOCKUP] Printfiles error:", errorText);
      throw new Error(`Failed to get printfiles: ${printfilesResponse.status}`);
    }

    const printfilesData = await printfilesResponse.json();
    console.log("[GENERATE-MOCKUP] Printfiles data:", JSON.stringify(printfilesData.result));

    // Get available placements from printfiles
    const availablePlacements = printfilesData.result?.available_placements || [];
    const printfiles = printfilesData.result?.printfiles || [];
    console.log("[GENERATE-MOCKUP] Available placements:", availablePlacements);
    console.log("[GENERATE-MOCKUP] Printfiles:", JSON.stringify(printfiles));

    // Find the correct placement - use the first available one if "default" is not allowed
    let validPlacement = body.files?.[0]?.placement || "default";
    if (availablePlacements.length > 0 && !availablePlacements.includes(validPlacement)) {
      validPlacement = availablePlacements[0];
      console.log("[GENERATE-MOCKUP] Using placement:", validPlacement);
    }

    // Find printfile info for the placement to get correct dimensions
    const printfileInfo = printfiles.find((pf: { placement: string }) => pf.placement === validPlacement) || printfiles[0];
    console.log("[GENERATE-MOCKUP] Printfile info for placement:", JSON.stringify(printfileInfo));

    // Step 2: Create mockup generation task with retry logic
    // Update files with correct placement and position based on printfile dimensions
    const updatedFiles = body.files.map((file: { placement: string; image_url: string; position: { area_width: number; area_height: number; width: number; height: number; top: number; left: number } }) => {
      const areaWidth = printfileInfo?.width || file.position.area_width;
      const areaHeight = printfileInfo?.height || file.position.area_height;
      
      // Scale the position proportionally
      const scaleX = areaWidth / file.position.area_width;
      const scaleY = areaHeight / file.position.area_height;
      
      return {
        ...file,
        placement: validPlacement,
        position: {
          area_width: areaWidth,
          area_height: areaHeight,
          width: Math.round(file.position.width * scaleX),
          height: Math.round(file.position.height * scaleY),
          top: Math.round(file.position.top * scaleY),
          left: Math.round(file.position.left * scaleX),
        }
      };
    });

    const mockupBody = {
      variant_ids: body.variant_ids,
      format: body.format || "jpg",
      files: updatedFiles,
    };

    console.log("[GENERATE-MOCKUP] Mockup request body:", JSON.stringify(mockupBody));

    // Retry function for rate limiting
    const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          const retryData = await response.json();
          const waitTime = retryData.error?.message?.match(/(\d+) seconds/)?.[1] || 30;
          console.log(`[GENERATE-MOCKUP] Rate limited, waiting ${waitTime} seconds (attempt ${attempt + 1}/${maxRetries})`);
          
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, (parseInt(waitTime) + 5) * 1000));
            continue;
          }
        }
        
        return response;
      }
      throw new Error("Max retries exceeded");
    };

    const response = await fetchWithRetry(
      `https://api.printful.com/mockup-generator/create-task/${productId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockupBody),
      }
    );

    const responseText = await response.text();
    console.log("[GENERATE-MOCKUP] Printful response status:", response.status);
    console.log("[GENERATE-MOCKUP] Printful response:", responseText);

    if (!response.ok) {
      console.error("[GENERATE-MOCKUP] Printful API error:", response.status, responseText);
      const errorMessage = response.status === 429 
        ? "Printful APIのレート制限に達しました。30秒後に再試行してください。"
        : `Printful API error: ${response.status}`;
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: responseText,
        retryAfter: response.status === 429 ? 35 : null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status === 429 ? 429 : 400,
      });
    }

    const data = JSON.parse(responseText);
    const taskKey = data.result?.task_key;

    if (!taskKey) {
      console.log("[GENERATE-MOCKUP] Task created but no task_key, returning printfiles data");
      return new Response(JSON.stringify({ 
        success: true, 
        printfiles: printfilesData.result,
        task: data.result
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Step 3: Poll for task result (with timeout)
    let mockupResult = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultResponse = await fetch(
        `https://api.printful.com/mockup-generator/task?task_key=${taskKey}`,
        {
          headers: {
            "Authorization": `Bearer ${PRINTFUL_API_KEY}`,
          },
        }
      );

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log("[GENERATE-MOCKUP] Task status:", resultData.result?.status);
        
        if (resultData.result?.status === "completed") {
          mockupResult = resultData.result;
          break;
        } else if (resultData.result?.status === "failed") {
          throw new Error("Mockup generation failed");
        }
      }
      
      attempts++;
    }

    if (!mockupResult) {
      return new Response(JSON.stringify({ 
        success: true, 
        task_key: taskKey,
        message: "Mockup generation in progress, check back later"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 202,
      });
    }

    console.log("[GENERATE-MOCKUP] Mockup completed:", JSON.stringify(mockupResult.mockups));

    return new Response(JSON.stringify({ 
      success: true, 
      mockups: mockupResult.mockups,
      printfiles: printfilesData.result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[GENERATE-MOCKUP] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
