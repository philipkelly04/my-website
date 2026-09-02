function localized(value) {
  return value?.default || value || "";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`NHL API returned ${response.status}`);
  }

  return response.json();
}

function findSeasonDetails(player, season) {
  const totals = Array.isArray(player.seasonTotals)
    ? player.seasonTotals
    : [];

  const matchingTotals = totals.filter(total => {
    return (
      total.leagueAbbrev === "NHL" &&
      total.gameTypeId === 2 &&
      total.season === season
    );
  });

  return matchingTotals.at(-1) || {};
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "Only GET requests are allowed."
    });
  }

  const team = String(request.query.team || "").toUpperCase();

  if (!/^[A-Z]{2,3}$/.test(team)) {
    return response.status(400).json({
      error: "A valid NHL team abbreviation is required."
    });
  }

  try {
    const roster = await fetchJson(
      `https://api-web.nhle.com/v1/roster/${team}/current`
    );

    const rosterPlayers = [
      ...(roster.forwards || []).map(player => ({
        ...player,
        group: "Forwards"
      })),
      ...(roster.defensemen || []).map(player => ({
        ...player,
        group: "Defence"
      })),
      ...(roster.goalies || []).map(player => ({
        ...player,
        group: "Goalies"
      }))
    ];

    const playerResults = await Promise.allSettled(
      rosterPlayers.map(player =>
        fetchJson(
          `https://api-web.nhle.com/v1/player/` +
          `${player.id || player.playerId}/landing`
        )
      )
    );

    const players = rosterPlayers.map((rosterPlayer, index) => {
      const result = playerResults[index];
      const details =
        result.status === "fulfilled" ? result.value : {};

      const featured =
        details.featuredStats?.regularSeason || {};

      const season = details.featuredStats?.season;
      const seasonDetails = findSeasonDetails(details, season);

      return {
        playerId:
          details.playerId ||
          rosterPlayer.id ||
          rosterPlayer.playerId,

        sweaterNumber:
          rosterPlayer.sweaterNumber ?? null,

        firstName:
          localized(details.firstName) ||
          localized(rosterPlayer.firstName),

        lastName:
          localized(details.lastName) ||
          localized(rosterPlayer.lastName),

        position:
          details.position ||
          rosterPlayer.positionCode ||
          "",

        shootsCatches:
          details.shootsCatches ||
          rosterPlayer.shootsCatches ||
          "",

        birthDate:
          details.birthDate ||
          rosterPlayer.birthDate ||
          null,

        headshot:
          details.headshot ||
          rosterPlayer.headshot ||
          null,

        group: rosterPlayer.group,
        season,

        current: featured.subSeason || {},
        career: featured.career || {},

        seasonDetails: {
          avgToi: seasonDetails.avgToi || null,
          gamesStarted: seasonDetails.gamesStarted ?? null
        }
      };
    });

    players.sort((a, b) => {
      const groupOrder = {
        Forwards: 1,
        Defence: 2,
        Goalies: 3
      };

      return (
        groupOrder[a.group] - groupOrder[b.group] ||
        (a.sweaterNumber ?? 999) - (b.sweaterNumber ?? 999)
      );
    });

    response.setHeader(
      "Cache-Control",
      "s-maxage=21600, stale-while-revalidate=86400"
    );

    return response.status(200).json({
      team,
      logo:
        `https://assets.nhle.com/logos/nhl/svg/` +
        `${team}_light.svg`,
      players
    });
  } catch (error) {
    console.error("Player Lab API error:", error);

    return response.status(502).json({
      error: "Unable to retrieve Player Lab data."
    });
  }
}
