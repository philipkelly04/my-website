const TEAM_COLORS = {
  ANA: "#fc4c02",
  BOS: "#ffb81c",
  BUF: "#003087",
  CAR: "#cc0000",
  CBJ: "#002654",
  CGY: "#d2001c",
  CHI: "#cf0a2c",
  COL: "#6f263d",
  DAL: "#006847",
  DET: "#ce1126",
  EDM: "#041e42",
  FLA: "#c8102e",
  LAK: "#111111",
  MIN: "#154734",
  MTL: "#af1e2d",
  NJD: "#ce1126",
  NSH: "#ffb81c",
  NYI: "#00539b",
  NYR: "#0038a8",
  OTT: "#c52032",
  PHI: "#f74902",
  PIT: "#fcb514",
  SEA: "#001628",
  SJS: "#006d75",
  STL: "#002f87",
  TBL: "#002868",
  TOR: "#00205b",
  UTA: "#69b3e7",
  VAN: "#00205b",
  VGK: "#b4975a",
  WPG: "#041e42",
  WSH: "#041e42"
};

const loadingMessage = document.querySelector("#loadingMessage");
const errorMessage = document.querySelector("#errorMessage");
const gameContent = document.querySelector("#gameContent");

function teamName(team) {
  return (
    team.commonName?.default ||
    team.placeName?.default ||
    team.abbrev ||
    "Team"
  );
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value ?? "";
}

function formatGameDate(game) {
  const date = new Date(game.startTimeUTC);

  const formattedDate = date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const formattedTime = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  const venue = game.venue?.default;

  return venue
    ? `${formattedDate} • ${formattedTime} • ${venue}`
    : `${formattedDate} • ${formattedTime}`;
}

function ordinalPeriod(periodNumber) {
  if (periodNumber === 1) return "1st";
  if (periodNumber === 2) return "2nd";
  if (periodNumber === 3) return "3rd";

  return `${periodNumber}th`;
}

function formatGameStatus(game) {
  if (game.gameState === "FINAL" || game.gameState === "OFF") {
    const periodType = game.periodDescriptor?.periodType;

    if (periodType === "OT") return "Final / OT";
    if (periodType === "SO") return "Final / Shootout";

    return "Final";
  }

  if (game.gameState === "LIVE" || game.gameState === "CRIT") {
    const period = game.periodDescriptor?.number;
    const timeRemaining = game.clock?.timeRemaining;

    if (game.clock?.inIntermission) {
      return period ? `End of ${ordinalPeriod(period)}` : "Intermission";
    }

    if (period && timeRemaining) {
      return `${timeRemaining} • ${ordinalPeriod(period)} Period`;
    }

    return "Live";
  }

  return "Scheduled";
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  row.appendChild(cell);
}

function showNoStats(tableBody) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 7;
  cell.textContent = "Player statistics will appear when the game begins.";
  cell.style.textAlign = "center";

  row.appendChild(cell);
  tableBody.appendChild(row);
}

function displayPlayerStats(teamStats, tableBodyId) {
  const tableBody = document.querySelector(tableBodyId);
  tableBody.replaceChildren();

  if (!teamStats) {
    showNoStats(tableBody);
    return;
  }

  const skaters = [
    ...(teamStats.forwards || []),
    ...(teamStats.defense || [])
  ];

  skaters.sort((a, b) => {
    return (
      (b.points || 0) - (a.points || 0) ||
      (b.goals || 0) - (a.goals || 0) ||
      (b.assists || 0) - (a.assists || 0)
    );
  });

  if (skaters.length === 0) {
    showNoStats(tableBody);
    return;
  }

  for (const player of skaters) {
    const row = document.createElement("tr");

    addCell(
      row,
      `#${player.sweaterNumber || "—"} ${player.name?.default || "Player"}`
    );
    addCell(row, player.goals ?? 0);
    addCell(row, player.assists ?? 0);
    addCell(row, player.points ?? 0);
    addCell(row, player.plusMinus ?? 0);
    addCell(row, player.sog ?? 0);
    addCell(row, player.toi || "—");

    tableBody.appendChild(row);
  }
}

function displayGame(game) {
  const away = game.awayTeam;
  const home = game.homeTeam;

  document.documentElement.style.setProperty(
    "--away-color",
    TEAM_COLORS[away.abbrev] || "#555555"
  );

  document.documentElement.style.setProperty(
    "--home-color",
    TEAM_COLORS[home.abbrev] || "#222222"
  );

  const awayLogo = document.querySelector("#awayLogo");
  awayLogo.src = away.logo;
  awayLogo.alt = `${teamName(away)} logo`;

  const homeLogo = document.querySelector("#homeLogo");
  homeLogo.src = home.logo;
  homeLogo.alt = `${teamName(home)} logo`;

  setText("#gameDetails", formatGameDate(game));
  setText("#awayName", teamName(away));
  setText("#homeName", teamName(home));
  setText("#awayRecord", away.abbrev);
  setText("#homeRecord", home.abbrev);
  setText("#awayScore", away.score ?? 0);
  setText("#homeScore", home.score ?? 0);
  setText("#awayShots", away.sog ?? 0);
  setText("#homeShots", home.sog ?? 0);
  setText("#gameStatus", formatGameStatus(game));

  setText("#awayStatsHeading", `${teamName(away)} Skaters`);
  setText("#homeStatsHeading", `${teamName(home)} Skaters`);

  displayPlayerStats(
    game.playerByGameStats?.awayTeam,
    "#awayPlayerStats"
  );

  displayPlayerStats(
    game.playerByGameStats?.homeTeam,
    "#homePlayerStats"
  );

  document.title =
    `${away.abbrev} vs ${home.abbrev} | PuckLab Game Center`;

  loadingMessage.hidden = true;
  errorMessage.hidden = true;
  gameContent.hidden = false;
}

function showError(message) {
  loadingMessage.hidden = true;
  gameContent.hidden = true;
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

async function loadGame() {
  const parameters = new URLSearchParams(window.location.search);
  const gameId = parameters.get("id");

  if (!gameId) {
    showError("No game was selected. Return to PuckLab and choose a game.");
    return;
  }

  try {
    const response = await fetch(
      `/api/game?id=${encodeURIComponent(gameId)}`
    );

    const game = await response.json();

    if (!response.ok) {
      throw new Error(game.error || "Unable to load this game.");
    }

    displayGame(game);
  } catch (error) {
    console.error("Game Center error:", error);
    showError(error.message || "Unable to load this game.");
  }
}

loadGame();
