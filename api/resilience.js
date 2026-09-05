export const config = {
  maxDuration: 60
};

const SEASON = "20262027";

const TEAMS = new Set(
  (
    "ANA BOS BUF CAR CBJ CGY CHI COL DAL DET EDM FLA " +
    "LAK MIN MTL NJD NSH NYI NYR OTT PHI PIT SEA SJS " +
    "STL TBL TOR UTA VAN VGK WPG WSH"
  ).split(" ")
);

async function fetchNhl(path, signal) {
  const response = await fetch(
    `https://api-web.nhle.com/v1/${path}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(`NHL API returned ${response.status}`);
  }

  return response.json();
}

function analyseGame(data, team) {
  if (
    !Array.isArray(data.plays) ||
    !["FINAL", "OFF"].includes(data.gameState)
  ) {
    throw new Error("Incomplete game data");
  }

  const home = data.homeTeam;
  const away = data.awayTeam;
  const isHome = home?.abbrev === team;

  if (!isHome && away?.abbrev !== team) {
    throw new Error("Game does not contain the requested team");
  }

  if (
    !Number.isInteger(home.score) ||
    !Number.isInteger(away.score) ||
    home.score === away.score
  ) {
    throw new Error("Invalid final score");
  }

  let homeGoals = 0;
  let awayGoals = 0;
  let afterTwo = 0;
  let led = false;
  let trailedByTwo = false;

  const goals = data.plays
    .filter(play => play.typeDescKey === "goal")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const goal of goals) {
    const period = goal.periodDescriptor;

    // Shootout attempts are not goals in the game timeline.
    if (period?.periodType === "SO") continue;

    if (
      !Number.isInteger(period?.number) ||
      !Number.isFinite(goal.sortOrder)
    ) {
      throw new Error("Missing goal timing");
    }

    const owner = goal.details?.eventOwnerTeamId;

    if (owner === home.id) {
      homeGoals++;
    } else if (owner === away.id) {
      awayGoals++;
    } else {
      throw new Error("Unknown scoring team");
    }

    // Detect missing or inconsistent scoring events.
    if (
      goal.details.homeScore !== homeGoals ||
      goal.details.awayScore !== awayGoals
    ) {
      throw new Error("Incomplete scoring sequence");
    }

    const difference = isHome
      ? homeGoals - awayGoals
      : awayGoals - homeGoals;

    if (period.number <= 2) afterTwo = difference;
    if (difference > 0) led = true;
    if (difference <= -2) trailedByTwo = true;
  }

  const shootout =
    data.periodDescriptor?.periodType === "SO";

  const won = isHome
    ? home.score > away.score
    : away.score > home.score;

  // The final scoreboard awards one extra goal to a
  // shootout winner. It is not a lead during game play.
  const expectedHome = homeGoals + (
    shootout && home.score > away.score ? 1 : 0
  );

  const expectedAway = awayGoals + (
    shootout && away.score > home.score ? 1 : 0
  );

  if (
    expectedHome !== home.score ||
    expectedAway !== away.score ||
    (shootout && homeGoals !== awayGoals)
  ) {
    throw new Error("Goals do not match the final score");
  }

  return { won, afterTwo, led, trailedByTwo };
}

function emptyMetric() {
  return {
    opportunities: 0,
    successes: 0,
    games: []
  };
}

function addResult(metric, success, game) {
  metric.opportunities++;
  if (success) metric.successes++;

  metric.games.push({
    id: game.id,
    date: game.gameDate,
    away: game.awayTeam.abbrev,
    home: game.homeTeam.abbrev,
    awayScore: game.awayTeam.score,
    homeScore: game.homeTeam.score,
    success
  });
}

export default async function handler(request, response) {
  // Never cache errors or incomplete calculations.
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({
      error: "Only GET requests are allowed."
    });
  }

  const team = String(request.query.team || "").toUpperCase();
  const season = String(request.query.season || SEASON);
  const window = String(request.query.window || "season");

  if (
    !TEAMS.has(team) ||
    season !== SEASON ||
    !["season", "10"].includes(window)
  ) {
    return response.status(400).json({
      error: "Choose a valid team, 2026–27 season and game window."
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const schedule = await fetchNhl(
      `club-schedule-season/${team}/${season}`,
      controller.signal
    );

    if (
      !Array.isArray(schedule.games) ||
      String(schedule.season) !== season
    ) {
      throw new Error("Requested season schedule is unavailable");
    }

    let games = schedule.games
      .filter(game =>
        Number(game.gameType) === 2 &&
        String(game.season) === season &&
        ["FINAL", "OFF"].includes(game.gameState) &&
        (
          game.homeTeam?.abbrev === team ||
          game.awayTeam?.abbrev === team
        )
      )
      .sort((a, b) =>
        new Date(b.startTimeUTC) - new Date(a.startTimeUTC)
      );

    if (window === "10") games = games.slice(0, 10);

    const output = {
      team,
      season,
      window,
      gamesAnalysed: 0,
      updatedAt: new Date().toISOString(),
      oneGoalProtection: emptyMetric(),
      thirdPeriodRescue: emptyMetric(),
      multiGoalComeback: emptyMetric(),
      leadSlips: emptyMetric()
    };

    // Limit simultaneous NHL requests.
    const analyses = new Array(games.length);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < games.length) {
        const index = nextIndex++;
        const game = games[index];

        const data = await fetchNhl(
          `gamecenter/${game.id}/play-by-play`,
          controller.signal
        );

        if (String(data.id) !== String(game.id)) {
          throw new Error("Play-by-play game ID mismatch");
        }

        analyses[index] = analyseGame(data, team);
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(4, games.length) },
        () => worker()
      )
    );

    for (let index = 0; index < games.length; index++) {
      const game = games[index];
      const analysis = analyses[index];

      output.gamesAnalysed++;

      if (analysis.afterTwo === 1) {
        addResult(
          output.oneGoalProtection,
          analysis.won,
          game
        );
      }

      if (analysis.afterTwo < 0) {
        addResult(
          output.thirdPeriodRescue,
          analysis.won,
          game
        );
      }

      if (analysis.trailedByTwo) {
        addResult(
          output.multiGoalComeback,
          analysis.won,
          game
        );
      }

      if (analysis.led) {
        addResult(
          output.leadSlips,
          !analysis.won,
          game
        );
      }
    }

    response.setHeader(
      "Cache-Control",
      games.length
        ? "public, max-age=0, s-maxage=300"
        : "public, max-age=0, s-maxage=60"
    );

    return response.status(200).json(output);
  } catch (error) {
    controller.abort();
    console.error("Resilience API error:", error);

    return response.status(502).json({
      error:
        "Complete scoring data could not be retrieved. " +
        "Please try again shortly."
    });
  } finally {
    clearTimeout(timeout);
  }
}
