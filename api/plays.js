export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "Only GET requests are allowed."
    });
  }

  const gameId = String(request.query.id || "");

  if (!/^\d{10}$/.test(gameId)) {
    return response.status(400).json({
      error: "A valid 10-digit game ID is required."
    });
  }

  try {
    const nhlResponse = await fetch(
      `https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`,
      {
        signal: AbortSignal.timeout(8000)
      }
    );

    if (nhlResponse.status === 404) {
      return response.status(404).json({
        error: "Play-by-play data was not found."
      });
    }

    if (!nhlResponse.ok) {
      throw new Error(`NHL API returned ${nhlResponse.status}`);
    }

    const data = await nhlResponse.json();

    if (!data?.id || !Array.isArray(data.plays)) {
      throw new Error("The NHL API returned incomplete play-by-play data.");
    }

    const gameFinished =
      data.gameState === "FINAL" || data.gameState === "OFF";

    response.setHeader(
  "Cache-Control",
  gameFinished
    ? "public, max-age=0, s-maxage=3600, stale-while-revalidate=60"
    : "public, max-age=0, s-maxage=15, stale-while-revalidate=15"
);

    return response.status(200).json(data);
  } catch (error) {
    console.error("Play-by-play API error:", error);

    return response.status(502).json({
      error: "Unable to retrieve play-by-play data."
    });
  }
}
