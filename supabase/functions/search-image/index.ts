import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "product-images";

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "jpg";
}

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SavignyCatalog/1.0)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100) return null;
    return { bytes: new Uint8Array(buffer), contentType };
  } catch {
    return null;
  }
}

async function storeProductImage(
  productId: string,
  sourceUrl: string,
  fallbackUrl?: string | null,
): Promise<string | null> {
  let downloaded = await downloadImage(sourceUrl);
  if (!downloaded && fallbackUrl) {
    downloaded = await downloadImage(fallbackUrl);
  }
  if (!downloaded) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase credentials not available");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const ext = extensionFromContentType(downloaded.contentType);
  const filePath = `${productId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, downloaded.bytes, {
      upsert: true,
      contentType: downloaded.contentType,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, ean, productId, sourceImageUrl } = await req.json();

    if (productId && sourceImageUrl) {
      const publicUrl = await storeProductImage(productId, sourceImageUrl);
      if (!publicUrl) {
        return new Response(JSON.stringify({ error: "Failed to download or store image" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ imageUrl: publicUrl, thumbnail: sourceImageUrl, stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SERPER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SERPER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const searchTerms = [query, ean].filter(Boolean).join(" ");
    console.log("Serper search:", searchTerms);

    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: searchTerms, gl: "br", hl: "pt-br" }),
    });

    const data = await res.json();
    console.log("Serper response status:", res.status);

    if (!res.ok) {
      console.error("Serper error:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: data.message || "Serper API error" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageUrl = data.images?.[0]?.imageUrl || null;
    const thumbnail = data.images?.[0]?.thumbnailUrl || null;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ imageUrl: null, thumbnail: null, stored: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (productId) {
      const publicUrl = await storeProductImage(productId, imageUrl, thumbnail);
      if (!publicUrl) {
        return new Response(
          JSON.stringify({ error: "Image found but failed to store in Supabase Storage" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ imageUrl: publicUrl, thumbnail, stored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ imageUrl, thumbnail, stored: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("search-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
