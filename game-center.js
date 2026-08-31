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

function createPlayerLookup(playData) {
  return new Map(
    (playData.rosterSpots || []).map(player => [
      player.playerId,
      `${player.firstName?.default || ""} ${player.lastName?.default || ""}`.trim()
    ])
  );
}

function playerName(players, playerId) {
  return players.get(playerId) || "Unknown player";
}

function periodName(play) {
  const number = play.periodDescriptor?.number;
  const type = play.periodDescriptor?.periodType;

  if (type === "OT") return "Overtime";
  if (type === "SO") return "Shootout";

  return `Period ${number}`;
}

function strengthLabel(play, playData) {
  const code = String(play.situationCode || "");

  if (code.length !== 4) return "";

  const awaySkaters = Number(code[1]);
  const homeSkaters = Number(code[2]);
  const awayGoalie = Number(code[0]);
  const homeGoalie = Number(code[3]);
  const ownerId = play.details?.eventOwnerTeamId;

  if (ownerId === playData.awayTeam.id) {
    if (homeGoalie === 0) return "EN";
    if (awaySkaters > homeSkaters) return "PP";
    if (awaySkaters < homeSkaters) return "SH";
  }

  if (ownerId === playData.homeTeam.id) {
    if (awayGoalie === 0) return "EN";
    if (homeSkaters > awaySkaters) return "PP";
    if (homeSkaters < awaySkaters) return "SH";
  }

  return "";
}

function displayScoringSummary(playData) {
  const container = document.querySelector("#scoringSummary");
  const players = createPlayerLookup(playData);

  const goals = playData.plays.filter(
    play => play.typeDescKey === "goal"
  );

  container.replaceChildren();

  if (goals.length === 0) {
    const message = document.createElement("p");
    message.className = "stats-message";
    message.textContent = "No goals have been recorded.";
    container.appendChild(message);
    return;
  }

  let previousPeriod = null;

  for (const goal of goals) {
    const details = goal.details || {};
    const currentPeriod = periodName(goal);

    if (currentPeriod !== previousPeriod) {
      const heading = document.createElement("h3");
      heading.className = "scoring-period";
      heading.textContent = currentPeriod;
      container.appendChild(heading);
      previousPeriod = currentPeriod;
    }

    const scoringTeam =
      details.eventOwnerTeamId === playData.awayTeam.id
        ? playData.awayTeam
        : playData.homeTeam;

    const play = document.createElement("div");
    play.className = "scoring-play";

    const time = document.createElement("div");
    time.className = "scoring-time";
    time.textContent = goal.timeInPeriod || "—";

    const logo = document.createElement("img");
    logo.className = "scoring-logo";
    logo.src = scoringTeam.logo;
    logo.alt = `${scoringTeam.abbrev} logo`;

    const description = document.createElement("div");

    const scorer = document.createElement("p");
    scorer.className = "scoring-player";
    scorer.textContent =
      `${playerName(players, details.scoringPlayerId)} ` +
      `(${details.scoringPlayerTotal ?? "—"})`;

    const label = strengthLabel(goal, playData);

    if (label) {
      const badge = document.createElement("span");
      badge.className = "scoring-label";
      badge.textContent = label;
      scorer.appendChild(badge);
    }

    const assists = [];

    if (details.assist1PlayerId) {
      assists.push(
        `${playerName(players, details.assist1PlayerId)} ` +
        `(${details.assist1PlayerTotal ?? "—"})`
      );
    }

    if (details.assist2PlayerId) {
      assists.push(
        `${playerName(players, details.assist2PlayerId)} ` +
        `(${details.assist2PlayerTotal ?? "—"})`
      );
    }

    const assistText = document.createElement("p");
    assistText.className = "scoring-assists";
    assistText.textContent = assists.length
      ? `Assists: ${assists.join(", ")}`
      : "Unassisted";

    description.append(scorer, assistText);

    if (details.highlightClipSharingUrl) {
      const highlight = document.createElement("a");
      highlight.href = details.highlightClipSharingUrl;
      highlight.target = "_blank";
      highlight.rel = "noopener noreferrer";
      highlight.textContent = "Watch goal";
      highlight.className = "goal-highlight";
      description.appendChild(highlight);
    }

    const score = document.createElement("div");
    score.className = "scoring-score";
    score.textContent =
      `${playData.awayTeam.abbrev} ${details.awayScore ?? 0} – ` +
      `${playData.homeTeam.abbrev} ${details.homeScore ?? 0}`;

    play.append(time, logo, description, score);
    container.appendChild(play);
  }
}

function eventDisplayName(type) {
  const names = {
    goal: "Goal",
    "shot-on-goal": "Shot on goal",
    "missed-shot": "Missed shot",
    "blocked-shot": "Blocked shot"
  };

  return names[type] || "Shot";
}

function eventPlayerId(play) {
  if (play.typeDescKey === "goal") {
    return play.details?.scoringPlayerId;
  }

  return play.details?.shootingPlayerId;
}

function setupTeamFilters(playData) {
  const allButton = document.querySelector(
    '.team-filter[data-team="all"]'
  );

  const awayButton = document.querySelector("#awayTeamFilter");
  const homeButton = document.querySelector("#homeTeamFilter");
  const detailsBox = document.querySelector("#shotMapDetails");

  awayButton.textContent = playData.awayTeam.abbrev;
  awayButton.dataset.team = String(playData.awayTeam.id);
  awayButton.style.setProperty(
    "--filter-color",
    TEAM_COLORS[playData.awayTeam.abbrev] || "#ffffff"
  );

  homeButton.textContent = playData.homeTeam.abbrev;
  homeButton.dataset.team = String(playData.homeTeam.id);
  homeButton.style.setProperty(
    "--filter-color",
    TEAM_COLORS[playData.homeTeam.abbrev] || "#ffffff"
  );

  allButton.style.setProperty("--filter-color", "#ffffff");

  const buttons = [allButton, awayButton, homeButton];

  for (const button of buttons) {
    button.onclick = () => {
      const selectedTeam = button.dataset.team;
      const markers = [
        ...document.querySelectorAll("#shotMarkers .map-event")
      ];

      let visibleCount = 0;

      for (const marker of markers) {
        const shouldShow =
          selectedTeam === "all" ||
          marker.dataset.teamId === selectedTeam;

        marker.style.display = shouldShow ? "" : "none";

        if (shouldShow) {
          visibleCount += 1;
        }
      }

      for (const filterButton of buttons) {
        filterButton.classList.toggle(
          "active",
          filterButton === button
        );
      }

      const selectedName =
        selectedTeam === "all"
          ? "all teams"
          : button.textContent;

      detailsBox.textContent =
        `${visibleCount} shot events shown for ${selectedName}.`;
    };
  }
}


function displayShotMap(playData) {
  const markerGroup = document.querySelector("#shotMarkers");
  const detailsBox = document.querySelector("#shotMapDetails");
  const players = createPlayerLookup(playData);
  const svgNamespace = "http://www.w3.org/2000/svg";

  const supportedEvents = new Set([
    "goal",
    "shot-on-goal",
    "missed-shot",
    "blocked-shot"
  ]);

  const shots = playData.plays.filter(play => {
    return (
      supportedEvents.has(play.typeDescKey) &&
      Number.isFinite(play.details?.xCoord) &&
      Number.isFinite(play.details?.yCoord)
    );
  });

  markerGroup.replaceChildren();

  for (const shot of shots) {
    const details = shot.details;
    const x = details.xCoord + 100;
    const y = 42.5 - details.yCoord;

    const team =
      details.eventOwnerTeamId === playData.awayTeam.id
        ? playData.awayTeam
        : playData.homeTeam;

    const shooter = playerName(players, eventPlayerId(shot));
    const eventName = eventDisplayName(shot.typeDescKey);
    const shotType = details.shotType
      ? details.shotType.replaceAll("-", " ")
      : "";

    const marker = document.createElementNS(svgNamespace, "circle");

    marker.setAttribute("cx", x);
    marker.setAttribute("cy", y);
    marker.setAttribute(
      "r",
      shot.typeDescKey === "goal" ? "2.4" : "1.35"
    );

    const className = {
      goal: "map-goal",
      "shot-on-goal": "map-shot",
      "missed-shot": "map-miss",
      "blocked-shot": "map-block"
    }[shot.typeDescKey];

    marker.setAttribute("class", `map-event ${className}`);
    marker.dataset.teamId = String(details.eventOwnerTeamId);
    marker.setAttribute("tabindex", "0");
    marker.setAttribute(
      "aria-label",
      `${team.abbrev} ${eventName} by ${shooter}`
    );

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent =
      `${team.abbrev} • ${shooter} • ${eventName} • ` +
      `${periodName(shot)} ${shot.timeInPeriod}`;

    marker.appendChild(title);

    const showDetails = () => {
      detailsBox.textContent = [
        team.abbrev,
        shooter,
        eventName,
        shotType,
        periodName(shot),
        shot.timeInPeriod
      ].filter(Boolean).join(" • ");
    };

    marker.addEventListener("click", showDetails);
    marker.addEventListener("mouseenter", showDetails);
    marker.addEventListener("focus", showDetails);

    markerGroup.appendChild(marker);
  }

  if (shots.length === 0) {
    detailsBox.textContent =
      "Shot locations will appear after the game begins.";
    } else {
    detailsBox.textContent =
      `${shots.length} shot events plotted. Select a marker for details.`;
  }

  setupTeamFilters(playData);
}




async function loadGame() {
  const parameters = new URLSearchParams(window.location.search);
  const gameId = parameters.get("id");

  if (!gameId) {
    showError("No game was selected. Return to PuckLab and choose a game.");
    return;
  }

  try {
    const [gameResponse, playsResponse] = await Promise.all([
      fetch(`/api/game?id=${encodeURIComponent(gameId)}`),
      fetch(`/api/plays?id=${encodeURIComponent(gameId)}`)
    ]);

    const game = await gameResponse.json();

    if (!gameResponse.ok) {
      throw new Error(game.error || "Unable to load this game.");
    }

    displayGame(game);

    if (playsResponse.ok) {
      const playData = await playsResponse.json();
      displayScoringSummary(playData);
      displayShotMap(playData);
    } else {
      const scoringSummary = document.querySelector("#scoringSummary");
      const shotDetails = document.querySelector("#shotMapDetails");

      scoringSummary.innerHTML =
        '<p class="stats-message">Scoring details are unavailable.</p>';

      shotDetails.textContent =
        "Shot locations are currently unavailable.";
    }
  } catch (error) {
    console.error("Game Center error:", error);
    showError(error.message || "Unable to load this game.");
  }
}

loadGame();
