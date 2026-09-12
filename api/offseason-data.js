export const config = { maxDuration: 30 };

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "GET requests only."
    });
  }

  const report = String(request.query.report || "summary");
  const pageText = String(request.query.page || "0");

  if (
    !["summary", "realtime"].includes(report) ||
    !/^\d{1,2}$/.test(pageText) ||
    Number(pageText) > 19
  ) {
    return response.status(400).json({
      error: "Invalid report or page."
    });
  }

  const page = Number(pageText);

  const params = new URLSearchParams({
    isAggregate: "true",
    isGame: "false",
    start: String(page * 100),
    limit: "100",
    sort: JSON.stringify([
      { property: "playerId", direction: "ASC" }
    ]),
    cayenneExp: "seasonId=20252026 and gameTypeId=2"
  });

  try {
    const result = await fetch(
      `https://api.nhle.com/stats/rest/en/skater/${report}?${params}`,
      {
        signal: AbortSignal.timeout(12000)
      }
    );

    if (!result.ok) {
      throw new Error("Statistics request failed.");
    }

    const data = await result.json();

    if (
      !Array.isArray(data.data) ||
      !Number.isInteger(data.total) ||
      data.total < 1 ||
      data.total > 2000 ||
      data.data.length !== Math.min(
        100,
        Math.max(0, data.total - page * 100)
      )
    ) {
      throw new Error("Incomplete statistics page.");
    }

    const number = value =>
      Number.isInteger(value) && value >= 0 ? value : null;

    const players = data.data.map(player => ({
      id: player.playerId,
      gp: number(player.gamesPlayed),
      position: player.positionCode,
      goals: number(player.goals),
      assists: number(player.assists),
      points: number(player.points),
      shots: number(player.shots),
      hits: number(player.hits)
    }));

    if (
      players.some(player =>
        !Number.isInteger(player.id) ||
        player.id <= 0 ||
        player.gp === null
      )
    ) {
      throw new Error("Invalid player statistics.");
    }

    response.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600"
    );

    return response.status(200).json({
      report,
      page,
      season: 20252026,
      total: data.total,
      players,
      fetchedAt: new Date().toISOString()
    });
  } catch {
    return response.status(502).json({
      error: "Statistics unavailable. Please retry."
    });
  }
}
