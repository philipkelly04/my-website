export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "Only GET requests are allowed."
    });
  }

  const teamOne = String(request.query.team1 || "").toUpperCase();
  const teamTwo = String(request.query.team2 || "").toUpperCase();
  const latestSeason = String(request.query.season || "");

  const validTeam = /^[A-Z]{2,3}$/;
  const validSeason = /^\d{8}$/;

  if (
    !validTeam.test(teamOne) ||
    !validTeam.test(teamTwo) ||
    teamOne === teamTwo
  ) {
    return response.status(400).json({
      error: "Two different NHL team abbreviations are required."
    });
  }

  if (!validSeason.test(latestSeason)) {
    return response.status(400).json({
      error: "A valid NHL season is required."
    });
  }

  try {
    const latestStartYear = Number(latestSeason.slice(0, 4));

    const seasons = Array.from({ length: 6 }, (_, index) => {
      const startYear = latestStartYear - index;
      return `${startYear}${startYear + 1}`;
    });

    const scheduleResponses = await Promise.all(
      seasons.map(season =>
        fetch(
          `https://api-web.nhle.com/v1/club-schedule-season/` +
          `${teamOne}/${season}`,
          {
            signal: AbortSignal.timeout(8000)
          }
        )
      )
    );

    const schedules = await Promise.all(
      scheduleResponses.map(async nhlResponse => {
        if (!nhlResponse.ok) return [];

        const data = await nhlResponse.json();
        return Array.isArray(data.games) ? data.games : [];
      })
    );

    const games = schedules
      .flat()
      .filter(game => {
        const opponentMatches =
          game.awayTeam?.abbrev === teamTwo ||
          game.homeTeam?.abbrev === teamTwo;

        const gameFinished =
          game.gameState === "FINAL" ||
          game.gameState === "OFF";

        return opponentMatches && gameFinished;
      })
      .sort((a, b) => {
        return String(b.gameDate).localeCompare(String(a.gameDate));
      })
      .slice(0, 10);

    response.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400"
    );

    return response.status(200).json({
      teamOne,
      teamTwo,
      games
    });
  } catch (error) {
    console.error("Head-to-head API error:", error);

    return response.status(502).json({
      error: "Unable to retrieve head-to-head games."
    });
  }
}
