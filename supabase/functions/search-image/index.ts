import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    const cx = Deno.env.get("SEARCH_ENGINE_ID");

    if (!apiKey || !cx) {
      return new Response(
        JSON.stringify({ error: "Google API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQuery = encodeURIComponent(`${query} produto`);
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${searchQuery}&searchType=image&num=1&safe=active`;
    console.log("Requesting URL (key redacted):", url.replace(apiKey, "REDACTED"));

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("Google API error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: data.error?.message || "Google API error" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageUrl = data.items?.[0]?.link || null;
    const thumbnail = data.items?.[0]?.image?.thumbnailLink || null;

    return new Response(
      JSON.stringify({ imageUrl, thumbnail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("search-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
