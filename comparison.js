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

let standings = [];

const teamOneSelect = document.querySelector("#teamOneSelect");
const teamTwoSelect = document.querySelector("#teamTwoSelect");
const compareButton = document.querySelector("#compareButton");
const message = document.querySelector("#comparisonMessage");
const results = document.querySelector("#comparisonResults");
const statsContainer = document.querySelector("#comparisonStats");

function localized(value) {
  return value?.default || value || "";
}

function teamAbbreviation(team) {
  return localized(team.teamAbbrev) || team.abbrev || "";
}

function teamDisplayName(team) {
  return (
    localized(team.teamName) ||
    [
      localized(team.placeName),
      localized(team.commonName)
    ].filter(Boolean).join(" ") ||
    teamAbbreviation(team)
  );
}

function formatRecord(wins, losses, overtimeLosses) {
  return `${wins ?? 0}-${losses ?? 0}-${overtimeLosses ?? 0}`;
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) return "—";

  return value.toFixed(3).replace(/^0/, "");
}

function formatDifferential(value) {
  if (!Number.isFinite(value)) return "—";

  return value > 0 ? `+${value}` : String(value);
}

function formatSeason(seasonId) {
  const value = String(seasonId || "");

  if (value.length !== 8) return "current";

  return `${value.slice(0, 4)}–${value.slice(6)}`;
}

function setHeading(prefix, team) {
  const abbreviation = teamAbbreviation(team);
  const heading = document.querySelector(`#${prefix}Heading`);
  const logo = document.querySelector(`#${prefix}Logo`);
  const name = document.querySelector(`#${prefix}Name`);
  const rank = document.querySelector(`#${prefix}Rank`);

  heading.style.setProperty(
    "--team-color",
    TEAM_COLORS[abbreviation] || "#555555"
  );

  logo.src =
    team.teamLogo ||
    `https://assets.nhle.com/logos/nhl/svg/${abbreviation}_light.svg`;

  logo.alt = `${teamDisplayName(team)} logo`;
  name.textContent = teamDisplayName(team);

  const division = localized(team.divisionName) || "Division";
  const divisionRank = team.divisionSequence
    ? `#${team.divisionSequence}`
    : "—";

  rank.textContent = `${divisionRank} in ${division}`;
}

function addStatRow({
  label,
  valueOne,
  valueTwo,
  comparisonOne,
  comparisonTwo,
  better = "higher"
}) {
  const row = document.createElement("div");
  row.className = "stat-row";

  const firstValue = document.createElement("div");
  firstValue.className = "stat-value";
  firstValue.textContent = valueOne;

  const statLabel = document.createElement("div");
  statLabel.className = "stat-label";
  statLabel.textContent = label;

  const secondValue = document.createElement("div");
  secondValue.className = "stat-value";
  secondValue.textContent = valueTwo;

  if (
    better &&
    Number.isFinite(comparisonOne) &&
    Number.isFinite(comparisonTwo) &&
    comparisonOne !== comparisonTwo
  ) {
    const firstHasAdvantage =
      better === "higher"
        ? comparisonOne > comparisonTwo
        : comparisonOne < comparisonTwo;

    if (firstHasAdvantage) {
      firstValue.classList.add("advantage");
    } else {
      secondValue.classList.add("advantage");
    }
  }

  row.append(firstValue, statLabel, secondValue);
  statsContainer.appendChild(row);
}

function displayComparison(teamOne, teamTwo) {
  setHeading("teamOne", teamOne);
  setHeading("teamTwo", teamTwo);

  statsContainer.replaceChildren();

  addStatRow({
    label: "Overall record",
    valueOne: formatRecord(
      teamOne.wins,
      teamOne.losses,
      teamOne.otLosses
    ),
    valueTwo: formatRecord(
      teamTwo.wins,
      teamTwo.losses,
      teamTwo.otLosses
    ),
    comparisonOne: teamOne.pointPctg,
    comparisonTwo: teamTwo.pointPctg
  });

  addStatRow({
    label: "Games played",
    valueOne: teamOne.gamesPlayed ?? "—",
    valueTwo: teamTwo.gamesPlayed ?? "—",
    better: null
  });

  addStatRow({
    label: "Points",
    valueOne: teamOne.points ?? "—",
    valueTwo: teamTwo.points ?? "—",
    comparisonOne: teamOne.points,
    comparisonTwo: teamTwo.points
  });

  addStatRow({
    label: "Points percentage",
    valueOne: formatPercentage(teamOne.pointPctg),
    valueTwo: formatPercentage(teamTwo.pointPctg),
    comparisonOne: teamOne.pointPctg,
    comparisonTwo: teamTwo.pointPctg
  });

  addStatRow({
    label: "Goals for",
    valueOne: teamOne.goalFor ?? "—",
    valueTwo: teamTwo.goalFor ?? "—",
    comparisonOne: teamOne.goalFor,
    comparisonTwo: teamTwo.goalFor
  });

  addStatRow({
    label: "Goals against",
    valueOne: teamOne.goalAgainst ?? "—",
    valueTwo: teamTwo.goalAgainst ?? "—",
    comparisonOne: teamOne.goalAgainst,
    comparisonTwo: teamTwo.goalAgainst,
    better: "lower"
  });

  addStatRow({
    label: "Goal differential",
    valueOne: formatDifferential(teamOne.goalDifferential),
    valueTwo: formatDifferential(teamTwo.goalDifferential),
    comparisonOne: teamOne.goalDifferential,
    comparisonTwo: teamTwo.goalDifferential
  });

  addStatRow({
    label: "Home record",
    valueOne: formatRecord(
      teamOne.homeWins,
      teamOne.homeLosses,
      teamOne.homeOtLosses
    ),
    valueTwo: formatRecord(
      teamTwo.homeWins,
      teamTwo.homeLosses,
      teamTwo.homeOtLosses
    ),
    better: null
  });

  addStatRow({
    label: "Road record",
    valueOne: formatRecord(
      teamOne.roadWins,
      teamOne.roadLosses,
      teamOne.roadOtLosses
    ),
    valueTwo: formatRecord(
      teamTwo.roadWins,
      teamTwo.roadLosses,
      teamTwo.roadOtLosses
    ),
    better: null
  });

  addStatRow({
    label: "Last 10",
    valueOne: formatRecord(
      teamOne.l10Wins,
      teamOne.l10Losses,
      teamOne.l10OtLosses
    ),
    valueTwo: formatRecord(
      teamTwo.l10Wins,
      teamTwo.l10Losses,
      teamTwo.l10OtLosses
    ),
    better: null
  });

  addStatRow({
    label: "Current streak",
    valueOne:
      `${teamOne.streakCode || "—"}${teamOne.streakCount || ""}`,
    valueTwo:
      `${teamTwo.streakCode || "—"}${teamTwo.streakCount || ""}`,
    better: null
  });

  addStatRow({
    label: "Division rank",
    valueOne: teamOne.divisionSequence
      ? `#${teamOne.divisionSequence}`
      : "—",
    valueTwo: teamTwo.divisionSequence
      ? `#${teamTwo.divisionSequence}`
      : "—",
    comparisonOne: teamOne.divisionSequence,
    comparisonTwo: teamTwo.divisionSequence,
    better: "lower"
  });

  addStatRow({
    label: "League rank",
    valueOne: teamOne.leagueSequence
      ? `#${teamOne.leagueSequence}`
      : "—",
    valueTwo: teamTwo.leagueSequence
      ? `#${teamTwo.leagueSequence}`
      : "—",
    comparisonOne: teamOne.leagueSequence,
    comparisonTwo: teamTwo.leagueSequence,
    better: "lower"
  });

  message.hidden = true;
  results.hidden = false;
}

function compareSelectedTeams() {
  const teamOne = standings.find(
    team => teamAbbreviation(team) === teamOneSelect.value
  );

  const teamTwo = standings.find(
    team => teamAbbreviation(team) === teamTwoSelect.value
  );

  if (!teamOne || !teamTwo) {
    message.textContent = "Please select two NHL teams.";
    message.hidden = false;
    results.hidden = true;
    return;
  }

  if (teamOneSelect.value === teamTwoSelect.value) {
    message.textContent = "Please select two different teams.";
    message.hidden = false;
    results.hidden = true;
    return;
  }

  displayComparison(teamOne, teamTwo);
}

function populateTeamSelectors() {
  const sortedTeams = [...standings].sort((a, b) => {
    return teamDisplayName(a).localeCompare(teamDisplayName(b));
  });

  for (const team of sortedTeams) {
    const abbreviation = teamAbbreviation(team);
    const name = teamDisplayName(team);

    const firstOption = document.createElement("option");
    firstOption.value = abbreviation;
    firstOption.textContent = name;

    const secondOption = firstOption.cloneNode(true);

    teamOneSelect.appendChild(firstOption);
    teamTwoSelect.appendChild(secondOption);
  }

  if (standings.some(team => teamAbbreviation(team) === "CAR")) {
    teamOneSelect.value = "CAR";
  }

  if (standings.some(team => teamAbbreviation(team) === "VGK")) {
    teamTwoSelect.value = "VGK";
  }

  compareButton.disabled = false;
}

async function loadStandings() {
  compareButton.disabled = true;

  try {
    const response = await fetch("/api/standings");

    if (!response.ok) {
      throw new Error("Unable to load NHL standings.");
    }

    const data = await response.json();

    standings = Array.isArray(data.standings)
      ? data.standings
      : Array.isArray(data)
        ? data
        : [];

    if (standings.length < 2) {
      throw new Error("No standings data is currently available.");
    }

    populateTeamSelectors();

    const season = formatSeason(standings[0]?.seasonId);
    message.textContent = `Using ${season} regular-season standings.`;

    if (teamOneSelect.value && teamTwoSelect.value) {
      displayComparison(
        standings.find(
          team => teamAbbreviation(team) === teamOneSelect.value
        ),
        standings.find(
          team => teamAbbreviation(team) === teamTwoSelect.value
        )
      );
    }
  } catch (error) {
    console.error("Comparison error:", error);
    message.textContent =
      error.message || "Team comparisons are temporarily unavailable.";
  }
}

compareButton.addEventListener("click", compareSelectedTeams);

loadStandings();
