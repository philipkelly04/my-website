export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "Only GET requests are allowed."
    });
  }

  try {
    const nhlResponse = await fetch(
      "https://api-web.nhle.com/v1/score/now",
      {
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!nhlResponse.ok) {
      throw new Error(`NHL API returned ${nhlResponse.status}`);
    }

    const data = await nhlResponse.json();

    if (!Array.isArray(data.games)) {
      throw new Error("Unexpected NHL scores response.");
    }

    response.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=15, stale-while-revalidate=15"
    );

    return response.status(200).json(data);
  } catch (error) {
    console.error("Scores API error:", error);

    return response.status(502).json({
      error: "NHL scores are temporarily unavailable."
    });
  }
}
