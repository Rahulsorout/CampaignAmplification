import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Please provide a campaign idea." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create a clear, trustworthy campaign draft from this idea: "${prompt}".

Return ONLY valid JSON with these fields:
{
  "title": "short campaign title",
  "category": "Education, Environment, Health, Community, or Other",
  "creatorSummary": "short introduction",
  "description": "campaign overview",
  "storyHeadline": "story heading",
  "storyIntro": "engaging introduction",
  "storySections": [
    { "heading": "Section heading", "body": "Section content" }
  ],
  "adHeadline": "short advertising headline",
  "adDescription": "short advertising description",
  "adCta": "Learn More"
}

Do not invent statistics, achievements, sources, or facts. Clearly mark missing information as something the campaign creator must provide. This campaign raises funds to distribute and amplify a message, not to donate money to a cause.`
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", result);
      return new Response(
        JSON.stringify({ error: "AI generation failed. Please try again." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return new Response(JSON.stringify({ campaign: JSON.parse(text) }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Campaign generation error:", error);

    return new Response(
      JSON.stringify({ error: "Unable to generate the campaign right now." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});