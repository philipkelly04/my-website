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
      `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`,
      {
        signal: AbortSignal.timeout(8000)
      }
    );

    if (nhlResponse.status === 404) {
      return response.status(404).json({
        error: "Game not found."
      });
    }

    if (!nhlResponse.ok) {
      throw new Error(`NHL API returned ${nhlResponse.status}`);
    }

    const data = await nhlResponse.json();

    if (!data?.id || !data?.homeTeam || !data?.awayTeam) {
      throw new Error("The NHL API returned incomplete game data.");
    }

    const gameFinished =
      data.gameState === "FINAL" || data.gameState === "OFF";

    response.setHeader(
      "Cache-Control",
      gameFinished
        ? "s-maxage=86400, stale-while-revalidate=604800"
        : "s-maxage=30, stale-while-revalidate=60"
    );

    return response.status(200).json(data);
  } catch (error) {
    console.error("Game Center error:", error);

    return response.status(502).json({
      error: "Unable to retrieve Game Center data."
    });
  }
}
