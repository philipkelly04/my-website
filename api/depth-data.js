export const config = { maxDuration: 30 };

const TEAM_NAMES = {
  ANA: "Anaheim Ducks", BOS: "Boston Bruins", BUF: "Buffalo Sabres",
  CAR: "Carolina Hurricanes", CBJ: "Columbus Blue Jackets", CGY: "Calgary Flames",
  CHI: "Chicago Blackhawks", COL: "Colorado Avalanche", DAL: "Dallas Stars",
  DET: "Detroit Red Wings", EDM: "Edmonton Oilers", FLA: "Florida Panthers",
  LAK: "Los Angeles Kings", MIN: "Minnesota Wild", MTL: "Montréal Canadiens",
  NJD: "New Jersey Devils", NSH: "Nashville Predators", NYI: "New York Islanders",
  NYR: "New York Rangers", OTT: "Ottawa Senators", PHI: "Philadelphia Flyers",
  PIT: "Pittsburgh Penguins", SEA: "Seattle Kraken", SJS: "San Jose Sharks",
  STL: "St. Louis Blues", TBL: "Tampa Bay Lightning", TOR: "Toronto Maple Leafs",
  UTA: "Utah Mammoth", VAN: "Vancouver Canucks", VGK: "Vegas Golden Knights",
  WPG: "Winnipeg Jets", WSH: "Washington Capitals"
};

async function nhlJson(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });

      if (!result.ok) {
        throw new Error(`NHL returned ${result.status}`);
      }

      return await result.json();
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({
      error: "GET requests only."
    });
  }

  const kind = String(request.query.kind || "stats");

  try {
    if (kind === "roster") {
      const team = String(request.query.team || "").toUpperCase();

      if (!Object.hasOwn(TEAM_NAMES, team)) {
        return response.status(400).json({
          error: "Invalid team."
        });
      }

      const data = await nhlJson(
        `https://api-web.nhle.com/v1/roster/${team}/current`
      );

      if (
        !Array.isArray(data.forwards) ||
        !Array.isArray(data.defensemen)
      ) {
        throw new Error("Incomplete roster response");
      }

      const players = [
        ...data.forwards,
        ...data.defensemen
      ].map(player => ({
        id: player.id || player.playerId,
        name: [
          player.firstName?.default || player.firstName,
          player.lastName?.default || player.lastName
        ].filter(Boolean).join(" "),
        position: player.positionCode,
        number: player.sweaterNumber ?? null
      }));

      if (
        !players.length ||
        players.some(player => !Number.isInteger(player.id)) ||
        new Set(players.map(player => player.id)).size !== players.length
      ) {
        throw new Error("Roster is empty or contains invalid player IDs");
      }

      response.setHeader(
        "Cache-Control",
        "public, max-age=0, s-maxage=600"
      );

      return response.status(200).json({
        team,
        players,
        fetchedAt: new Date().toISOString()
      });
    }

    const season = String(request.query.season || "");
    const pageText = String(request.query.page || "0");

    if (
      kind !== "stats" ||
      !["20252026", "20262027"].includes(season) ||
      !/^\d{1,2}$/.test(pageText) ||
      Number(pageText) > 49
    ) {
      return response.status(400).json({
        error: "Invalid season or page."
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
      cayenneExp: `seasonId=${season} and gameTypeId=2`
    });

    const data = await nhlJson(
      `https://api.nhle.com/stats/rest/en/skater/summary?${params}`
    );

    if (
      !Array.isArray(data.data) ||
      !Number.isInteger(data.total) ||
      data.total < 0 ||
      data.data.length !== Math.min(
        100,
        Math.max(0, data.total - page * 100)
      )
    ) {
      throw new Error("Incomplete statistics page");
    }

    const players = data.data.map(player => ({
      id: player.playerId,
      gp: player.gamesPlayed,
      goals: player.goals
    }));

    if (
      players.some(player =>
        !Number.isInteger(player.id) ||
        !Number.isInteger(player.gp) ||
        player.gp < 0 ||
        !Number.isInteger(player.goals) ||
        player.goals < 0
      )
    ) {
      throw new Error("Invalid player statistics");
    }

    response.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=300"
    );

    return response.status(200).json({
      season,
      page,
      total: data.total,
      players,
      teams: Object.entries(TEAM_NAMES).map(([abbrev, name]) => ({
        abbrev,
        name
      })),
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Team depth:", error);

    return response.status(502).json({
      error: "NHL data is temporarily unavailable. Please retry."
    });
  }
}
