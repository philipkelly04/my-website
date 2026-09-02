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
  LAK: "#555555",
  MIN: "#154734",
  MTL: "#af1e2d",
  NJD: "#ce1126",
  NSH: "#ffb81c",
  NYI: "#00539b",
  NYR: "#0038a8",
  OTT: "#c52032",
  PHI: "#f74902",
  PIT: "#fcb514",
  SEA: "#008099",
  SJS: "#006d75",
  STL: "#002f87",
  TBL: "#002868",
  TOR: "#00205b",
  UTA: "#69b3e7",
  VAN: "#00205b",
  VGK: "#b4975a",
  WPG: "#041e42",
  WSH: "#c8102e"
};

const teamSelect = document.querySelector("#playerTeamSelect");
const statusMessage = document.querySelector("#playerLabStatus");
const results = document.querySelector("#playerLabResults");
const sortPpgButton = document.querySelector("#sortPpgButton");

let activePlayerData = null;
let sortByPpg = false;
let standings = [];

function localized(value) {
  return value?.default || value || "";
}

function teamAbbreviation(team) {
  return localized(team.teamAbbrev) || team.abbrev || "";
}

function teamName(team) {
  return localized(team.teamName) || teamAbbreviation(team);
}

function rate(total, games) {
  if (!Number.isFinite(total) || !Number.isFinite(games) || games <= 0) {
    return null;
  }

  return total / games;
}

function formatRate(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";

  return value.toFixed(digits).replace(/^0/, "");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";

  return `${(value * 100).toFixed(1)}%`;
}

function formatGoaliePercentage(value) {
  if (!Number.isFinite(value)) return "—";

  return value.toFixed(3).replace(/^0/, "");
}

function calculateAge(birthDate) {
  if (!birthDate) return null;

  const birth = new Date(`${birthDate}T12:00:00`);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const birthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (
      today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate()
    );

  if (!birthdayPassed) age -= 1;

  return age;
}

function positionName(position) {
  const positions = {
    L: "LW",
    R: "RW",
    C: "C",
    D: "D",
    G: "G"
  };

  return positions[position] || position || "—";
}

function averageToiMinutes(avgToi) {
  if (!avgToi || !avgToi.includes(":")) return null;

  const [minutes, seconds] = avgToi.split(":").map(Number);

  return minutes + (seconds / 60);
}

function pointsPerSixty(player) {
  const points = player.current?.points;
  const games = player.current?.gamesPlayed;
  const averageMinutes = averageToiMinutes(
    player.seasonDetails?.avgToi
  );

  if (
    !Number.isFinite(points) ||
    !Number.isFinite(games) ||
    games <= 0 ||
    !Number.isFinite(averageMinutes) ||
    averageMinutes <= 0
  ) {
    return null;
  }

  const totalHours = (games * averageMinutes) / 60;

  return points / totalHours;
}

function formatSeason(season) {
  const value = String(season || "");

  if (value.length !== 8) return "Current season";

  return `${value.slice(0, 4)}–${value.slice(6)}`;
}

function addRateStat(container, label, value) {
  const stat = document.createElement("span");
  stat.className = "rate-stat";

  const name = document.createTextNode(`${label} `);
  const number = document.createElement("strong");
  number.textContent = value;

  stat.append(name, number);
  container.appendChild(stat);
}

function createRateRow(label, stats) {
  const row = document.createElement("div");
  row.className = "rate-row";

  const rowLabel = document.createElement("span");
  rowLabel.className = "rate-label";
  rowLabel.textContent = label;

  const values = document.createElement("div");
  values.className = "rate-stats";

  for (const stat of stats) {
    addRateStat(values, stat.label, stat.value);
  }

  row.append(rowLabel, values);

  return row;
}

function createTrend(currentValue, careerValue, metric, digits = 2) {
  const trend = document.createElement("div");
  trend.className = "player-trend";

  const label = document.createElement("span");
  label.textContent = "Current vs career";

  const value = document.createElement("span");
  value.className = "trend-value";

  if (
    !Number.isFinite(currentValue) ||
    !Number.isFinite(careerValue)
  ) {
    value.textContent = "Not available";
    value.classList.add("trend-neutral");
    trend.append(label, value);
    return trend;
  }

  const difference = currentValue - careerValue;
  const absolute = Math.abs(difference)
    .toFixed(digits)
    .replace(/^0/, "");

  if (Math.abs(difference) < Math.pow(10, -digits)) {
    value.textContent = `Even ${metric}`;
    value.classList.add("trend-neutral");
  } else if (difference > 0) {
    value.textContent = `+${absolute} ${metric}`;
    value.classList.add("trend-positive");
  } else {
    value.textContent = `-${absolute} ${metric}`;
    value.classList.add("trend-negative");
  }

  trend.append(label, value);

  return trend;
}

function createPlayerHeader(player) {
  const header = document.createElement("div");
  header.className = "player-card-header";

  const number = document.createElement("div");
  number.className = "jersey-number";
  number.textContent =
    player.sweaterNumber != null
      ? `#${player.sweaterNumber}`
      : "—";

  const information = document.createElement("div");

  const name = document.createElement("h3");
  name.className = "player-name";
  name.textContent =
    `${player.firstName || ""} ${player.lastName || ""}`.trim();

  const details = document.createElement("p");
  details.className = "player-details";

  const age = calculateAge(player.birthDate);
  const sideLabel =
    player.position === "G" ? "Catches" : "Shoots";

  details.textContent = [
    positionName(player.position),
    player.shootsCatches
      ? `${sideLabel} ${player.shootsCatches}`
      : null,
    age != null ? `${age} years old` : null
  ].filter(Boolean).join(" · ");

  information.append(name, details);
  header.append(number, information);

  return header;
}

function createSkaterCard(player) {
  const current = player.current || {};
  const career = player.career || {};

  const currentGpg = rate(current.goals, current.gamesPlayed);
  const currentApg = rate(current.assists, current.gamesPlayed);
  const currentPpg = rate(current.points, current.gamesPlayed);
  const currentSpg = rate(current.shots, current.gamesPlayed);

  const careerGpg = rate(career.goals, career.gamesPlayed);
  const careerApg = rate(career.assists, career.gamesPlayed);
  const careerPpg = rate(career.points, career.gamesPlayed);
  const careerSpg = rate(career.shots, career.gamesPlayed);

  const card = document.createElement("article");
  card.className = "player-card";

  const rates = document.createElement("div");
  rates.className = "player-rates";

  rates.append(
    createRateRow("CURRENT", [
      {
        label: "GP",
        value: current.gamesPlayed ?? "—"
      },
      {
        label: "G/GP",
        value: formatRate(currentGpg)
      },
      {
        label: "A/GP",
        value: formatRate(currentApg)
      },
      {
        label: "P/GP",
        value: formatRate(currentPpg)
      },
      {
        label: "S/GP",
        value: formatRate(currentSpg)
      },
      {
        label: "SH%",
        value: formatPercent(current.shootingPctg)
      },
      {
        label: "P/60",
        value: formatRate(pointsPerSixty(player))
      }
    ]),

    createRateRow("CAREER", [
      {
        label: "GP",
        value: career.gamesPlayed ?? "—"
      },
      {
        label: "G/GP",
        value: formatRate(careerGpg)
      },
      {
        label: "A/GP",
        value: formatRate(careerApg)
      },
      {
        label: "P/GP",
        value: formatRate(careerPpg)
      },
      {
        label: "S/GP",
        value: formatRate(careerSpg)
      },
      {
        label: "SH%",
        value: formatPercent(career.shootingPctg)
      },
      {
  label: "P/60",
  value: "—"
}
    ])
  );

  card.append(
    createPlayerHeader(player),
    rates,
    createTrend(currentPpg, careerPpg, "P/GP")
  );

  return card;
}

function createGoalieCard(player) {
  const current = player.current || {};
  const career = player.career || {};

  const card = document.createElement("article");
  card.className = "player-card";

  const rates = document.createElement("div");
  rates.className = "player-rates";

  rates.append(
    createRateRow("CURRENT", [
      {
        label: "GP",
        value: current.gamesPlayed ?? "—"
      },
      {
        label: "STARTS",
        value: player.seasonDetails?.gamesStarted ?? "—"
      },
      {
        label: "W-L-OT",
        value:
          `${current.wins ?? 0}-` +
          `${current.losses ?? 0}-` +
          `${current.otLosses ?? 0}`
      },
      {
        label: "SV%",
        value: formatGoaliePercentage(current.savePctg)
      },
      {
        label: "GAA",
        value: formatRate(current.goalsAgainstAvg)
      },
      {
        label: "SO",
        value: current.shutouts ?? 0
      }
    ]),

    createRateRow("CAREER", [
      {
        label: "GP",
        value: career.gamesPlayed ?? "—"
      },
      {
        label: "W-L-OT",
        value:
          `${career.wins ?? 0}-` +
          `${career.losses ?? 0}-` +
          `${career.otLosses ?? 0}`
      },
      {
        label: "SV%",
        value: formatGoaliePercentage(career.savePctg)
      },
      {
        label: "GAA",
        value: formatRate(career.goalsAgainstAvg)
      },
      {
        label: "SO",
        value: career.shutouts ?? 0
      }
    ])
  );

  card.append(
    createPlayerHeader(player),
    rates,
    createTrend(
      current.savePctg,
      career.savePctg,
      "SV%",
      3
    )
  );

  return card;
}

function currentPpg(player) {
  const gamesPlayed = player.current?.gamesPlayed || 0;
  const points = player.current?.points || 0;

  return gamesPlayed > 0 ? points / gamesPlayed : -1;
}

function sortPlayersByPpg(players) {
  const groupOrder = {
    Forwards: 1,
    Defence: 2,
    Goalies: 3
  };

  return [...players].sort((a, b) => {
    if (a.group !== b.group) {
      return groupOrder[a.group] - groupOrder[b.group];
    }

    // Keep goalies in their normal order.
    if (a.group === "Goalies") {
      return (a.sweaterNumber || 999) - (b.sweaterNumber || 999);
    }

    return (
      currentPpg(b) - currentPpg(a) ||
      (a.sweaterNumber || 999) - (b.sweaterNumber || 999)
    );
  });
}

function displayTeamSummary(data) {
  const skaters = (data.players || []).filter(player => {
    return (
      player.group !== "Goalies" &&
      Number.isFinite(player.current?.gamesPlayed) &&
      player.current.gamesPlayed > 0
    );
  });

  const goalsPerGame = skaters.reduce((total, player) => {
    return total + (
      rate(
        player.current?.goals,
        player.current?.gamesPlayed
      ) || 0
    );
  }, 0);

  const shotsPerGame = skaters.reduce((total, player) => {
    return total + (
      rate(
        player.current?.shots,
        player.current?.gamesPlayed
      ) || 0
    );
  }, 0);

  const totalGoals = skaters.reduce((total, player) => {
    return total + (player.current?.goals || 0);
  }, 0);

  const totalShots = skaters.reduce((total, player) => {
    return total + (player.current?.shots || 0);
  }, 0);

  const shootingPercentage =
    totalShots > 0 ? totalGoals / totalShots : null;

  document.querySelector("#teamGoalsPerGame").textContent =
    skaters.length ? formatRate(goalsPerGame) : "—";

  document.querySelector("#teamShotsPerGame").textContent =
    skaters.length ? formatRate(shotsPerGame) : "—";

  document.querySelector("#teamShootingPercentage").textContent =
    formatPercent(shootingPercentage);
}



function displayPlayers(data) {
    const summaryReady =
    document.querySelector("#teamGoalsPerGame") &&
    document.querySelector("#teamShootingPercentage") &&
    document.querySelector("#teamShotsPerGame");

  if (summaryReady) {
    displayTeamSummary(data);
  }
  const forwards = document.querySelector("#forwardsGrid");
  const defence = document.querySelector("#defenceGrid");
  const goalies = document.querySelector("#goaliesGrid");

  forwards.replaceChildren();
  defence.replaceChildren();
  goalies.replaceChildren();

  const players = sortByPpg
  ? sortPlayersByPpg(data.players || [])
  : (data.players || []);

for (const player of players) {
    if (player.group === "Forwards") {
      forwards.appendChild(createSkaterCard(player));
    }

    if (player.group === "Defence") {
      defence.appendChild(createSkaterCard(player));
    }

    if (player.group === "Goalies") {
      goalies.appendChild(createGoalieCard(player));
    }
  }
}

async function loadTeam(team) {
  statusMessage.hidden = false;
  statusMessage.textContent = `Loading ${team} players…`;
  results.hidden = true;

  try {
    const response = await fetch(
      `/api/player-lab?team=${encodeURIComponent(team)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load players.");
    }

    const standingsTeam = standings.find(
      item => teamAbbreviation(item) === team
    );

    document.documentElement.style.setProperty(
      "--team-color",
      TEAM_COLORS[team] || "#69b3e7"
    );

    const logo = document.querySelector("#selectedTeamLogo");
    logo.src = data.logo;
    logo.alt = `${teamName(standingsTeam) || team} logo`;

    document.querySelector("#selectedTeamName").textContent =
      teamName(standingsTeam) || team;

    const season = data.players?.find(player => player.season)?.season;

    document.querySelector("#selectedSeason").textContent =
      `${formatSeason(season)} regular-season rates`;

    activePlayerData = data;
sortPpgButton.disabled = false;
displayPlayers(data);

    statusMessage.hidden = true;
    results.hidden = false;

    const url = new URL(window.location);
    url.searchParams.set("team", team);
    window.history.replaceState({}, "", url);
  } catch (error) {
    console.error("Player Lab error:", error);
    statusMessage.textContent =
      error.message || "Player Lab is temporarily unavailable.";
  }
}

function populateTeams() {
  const sortedTeams = [...standings].sort((a, b) => {
    return teamName(a).localeCompare(teamName(b));
  });

  teamSelect.replaceChildren();

  for (const team of sortedTeams) {
    const option = document.createElement("option");
    option.value = teamAbbreviation(team);
    option.textContent = teamName(team);
    teamSelect.appendChild(option);
  }

  const requestedTeam = new URLSearchParams(
    window.location.search
  ).get("team")?.toUpperCase();

  const validRequestedTeam = sortedTeams.some(
    team => teamAbbreviation(team) === requestedTeam
  );

  teamSelect.value = validRequestedTeam
    ? requestedTeam
    : "NJD";

  teamSelect.disabled = false;
  loadTeam(teamSelect.value);
}

async function loadTeams() {
  try {
    const response = await fetch("/api/standings");

    if (!response.ok) {
      throw new Error("Unable to load NHL teams.");
    }

    const data = await response.json();

    standings = Array.isArray(data.standings)
      ? data.standings
      : Array.isArray(data)
        ? data
        : [];

    if (!standings.length) {
      throw new Error("No NHL teams are currently available.");
    }

    populateTeams();
  } catch (error) {
    console.error("Team loading error:", error);
    statusMessage.textContent =
      error.message || "Unable to load Player Lab.";
  }
}

teamSelect.addEventListener("change", () => {
  loadTeam(teamSelect.value);
});

sortPpgButton.addEventListener("click", () => {
  sortByPpg = !sortByPpg;

  sortPpgButton.setAttribute(
    "aria-pressed",
    String(sortByPpg)
  );

  sortPpgButton.textContent = sortByPpg
    ? "Sort by jersey number"
    : "Sort by P/GP";

  if (activePlayerData) {
    displayPlayers(activePlayerData);
  }
});

loadTeams();
