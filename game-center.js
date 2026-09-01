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

function addGoalieStat(container, value, label) {
  const stat = document.createElement("div");
  stat.className = "goalie-stat";

  const statValue = document.createElement("span");
  statValue.className = "goalie-stat-value";
  statValue.textContent = value ?? "—";

  const statLabel = document.createElement("span");
  statLabel.className = "goalie-stat-label";
  statLabel.textContent = label;

  stat.append(statValue, statLabel);
  container.appendChild(stat);
}

function formatSavePercentage(value) {
  if (!Number.isFinite(value)) return "—";

  return value.toFixed(3).replace(/^0/, "");
}

function createGoalieCard(goalie, team, game) {
  const card = document.createElement("article");
  card.className = "goalie-card";

  card.style.setProperty(
    "--goalie-team-color",
    TEAM_COLORS[team.abbrev] || "#ffffff"
  );

  const header = document.createElement("div");
  header.className = "goalie-header";

  const headshot = document.createElement("img");
  headshot.className = "goalie-headshot";
  headshot.src =
    `https://assets.nhle.com/mugs/nhl/${game.season}/` +
    `${team.abbrev}/${goalie.playerId}.png`;

  headshot.alt = `${goalie.name?.default || "Goalie"} headshot`;

  headshot.onerror = () => {
    headshot.onerror = null;
    headshot.src = team.logo;
  };

  const information = document.createElement("div");

  const name = document.createElement("h3");
  name.className = "goalie-name";
  name.textContent =
    `#${goalie.sweaterNumber ?? "—"} ` +
    `${goalie.name?.default || "Goalie"}`;

  const teamLabel = document.createElement("p");
  teamLabel.className = "goalie-team";
  teamLabel.textContent = team.abbrev;

  const badges = document.createElement("div");
  badges.className = "goalie-badges";

  if (goalie.starter) {
    const starterBadge = document.createElement("span");
    starterBadge.className = "goalie-badge";
    starterBadge.textContent = "STARTER";
    badges.appendChild(starterBadge);
  }

  if (goalie.decision) {
    const decisionBadge = document.createElement("span");
    decisionBadge.className = "goalie-badge";

    const decisions = {
      W: "WIN",
      L: "LOSS",
      O: "OT LOSS"
    };

    decisionBadge.textContent =
      decisions[goalie.decision] || goalie.decision;

    badges.appendChild(decisionBadge);
  }

  information.append(name, teamLabel, badges);
  header.append(headshot, information);

  const stats = document.createElement("div");
  stats.className = "goalie-stats";

  addGoalieStat(stats, goalie.saves ?? 0, "Saves");
  addGoalieStat(stats, goalie.shotsAgainst ?? 0, "Shots faced");
  addGoalieStat(
    stats,
    formatSavePercentage(goalie.savePctg),
    "Save %"
  );
  addGoalieStat(stats, goalie.goalsAgainst ?? 0, "Goals allowed");
  addGoalieStat(stats, goalie.toi || "—", "Time on ice");
  addGoalieStat(
    stats,
    goalie.evenStrengthShotsAgainst || "—",
    "EV saves"
  );
  addGoalieStat(
    stats,
    goalie.powerPlayShotsAgainst || "—",
    "PP saves"
  );
  addGoalieStat(
    stats,
    goalie.shorthandedShotsAgainst || "—",
    "SH saves"
  );
  addGoalieStat(stats, goalie.pim ?? 0, "PIM");

  card.append(header, stats);

  return card;
}

function displayGoalies(game) {
  const container = document.querySelector("#goalieCards");

  if (!container) return;

  container.replaceChildren();

  const teamGroups = [
    {
      team: game.awayTeam,
      goalies: game.playerByGameStats?.awayTeam?.goalies || []
    },
    {
      team: game.homeTeam,
      goalies: game.playerByGameStats?.homeTeam?.goalies || []
    }
  ];

  let displayedGoalies = 0;

  for (const group of teamGroups) {
    const goaliesWhoPlayed = group.goalies.filter(goalie => {
      return goalie.starter || (
        goalie.toi &&
        goalie.toi !== "00:00"
      );
    });

    for (const goalie of goaliesWhoPlayed) {
      container.appendChild(
        createGoalieCard(goalie, group.team, game)
      );

      displayedGoalies += 1;
    }
  }

  if (displayedGoalies === 0) {
    const message = document.createElement("p");
    message.className = "stats-message";
    message.textContent =
      "Goalie statistics will appear when the game begins.";

    container.appendChild(message);
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
  displayGoalies(game);
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


function clockToSeconds(clock = "00:00") {
  const [minutes, seconds] = clock.split(":").map(Number);

  return (minutes || 0) * 60 + (seconds || 0);
}

function playTimeInSeconds(play, game) {
  const period = play.periodDescriptor?.number || 1;
  const periodType = play.periodDescriptor?.periodType;

  if (periodType === "SO") return null;

  const elapsed = clockToSeconds(play.timeInPeriod);

  if (period <= 3) {
    return ((period - 1) * 20 * 60) + elapsed;
  }

  const overtimeLength = game.gameType === 2
    ? 5 * 60
    : 20 * 60;

  return (
    (3 * 20 * 60) +
    ((period - 4) * overtimeLength) +
    elapsed
  );
}

function gameLengthInSeconds(game) {
  const playableEvents = (game.plays || [])
    .map(play => playTimeInSeconds(play, game))
    .filter(Number.isFinite);

  const latestEvent = playableEvents.length
    ? Math.max(...playableEvents)
    : 0;

  const finalGame =
    game.gameState === "FINAL" ||
    game.gameState === "OFF";

  const finishType = game.gameOutcome?.lastPeriodType;

  if (finalGame && finishType === "REG") {
    return 60 * 60;
  }

  if (finalGame && finishType === "SO") {
    return 65 * 60;
  }

  return latestEvent;
}

function gameLeader(awayScore, homeScore) {
  if (awayScore > homeScore) return "away";
  if (homeScore > awayScore) return "home";

  return "tied";
}

function formatControlTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function displayGameControl(playData) {
  const segmentsContainer =
    document.querySelector("#controlSegments");

  const markersContainer =
    document.querySelector("#controlMarkers");

  const result = document.querySelector("#controlResult");
  const controlBar = document.querySelector("#controlBar");

  const away = playData.awayTeam;
  const home = playData.homeTeam;

  const awayColor = TEAM_COLORS[away.abbrev] || "#555555";
  const homeColor = TEAM_COLORS[home.abbrev] || "#222222";
  const tiedColor = "#747b85";

  setText("#awayControlName", away.abbrev);
  setText("#homeControlName", home.abbrev);
  setText("#awayLeadLabel", `${away.abbrev} leading`);
  setText("#homeLeadLabel", `${home.abbrev} leading`);

  document.querySelector("#awayControlSwatch").style.background =
    awayColor;

  document.querySelector("#homeControlSwatch").style.background =
    homeColor;

  segmentsContainer.replaceChildren();
  markersContainer.replaceChildren();

  const totalGameTime = gameLengthInSeconds(playData);

  if (!totalGameTime) {
    result.textContent = "Available after puck drop";
    controlBar.hidden = true;

    setText("#awayLeadTime", "—");
    setText("#tiedTime", "—");
    setText("#homeLeadTime", "—");
    setText("#leadChanges", "—");
    setText("#largestLead", "—");

    return;
  }

  controlBar.hidden = false;

  const goals = (playData.plays || [])
    .filter(play => {
      return (
        play.typeDescKey === "goal" &&
        play.periodDescriptor?.periodType !== "SO"
      );
    })
    .map(play => ({
      play,
      time: playTimeInSeconds(play, playData)
    }))
    .filter(goal => Number.isFinite(goal.time))
    .sort((a, b) => a.time - b.time);

  const segments = [];
  const totals = {
    away: 0,
    tied: 0,
    home: 0
  };

  let awayScore = 0;
  let homeScore = 0;
  let currentLeader = "tied";
  let previousTime = 0;
  let previousTeamLeader = null;
  let leadChanges = 0;
  let largestLeadAmount = 0;
  let largestLeadTeam = null;

  function addSegment(endTime) {
    const duration = Math.max(0, endTime - previousTime);

    if (duration > 0) {
      segments.push({
        leader: currentLeader,
        duration
      });

      totals[currentLeader] += duration;
    }

    previousTime = endTime;
  }

  for (const goal of goals) {
    addSegment(goal.time);

    awayScore = goal.play.details?.awayScore ?? awayScore;
    homeScore = goal.play.details?.homeScore ?? homeScore;

    const newLeader = gameLeader(awayScore, homeScore);

    if (newLeader !== "tied") {
      if (
        previousTeamLeader &&
        previousTeamLeader !== newLeader
      ) {
        leadChanges += 1;
      }

      previousTeamLeader = newLeader;
    }

    const difference = Math.abs(awayScore - homeScore);

    if (difference > largestLeadAmount) {
      largestLeadAmount = difference;
      largestLeadTeam = newLeader;
    }

    currentLeader = newLeader;
  }

  addSegment(totalGameTime);

  const colours = {
    away: awayColor,
    tied: tiedColor,
    home: homeColor
  };

  for (const segment of segments) {
    const element = document.createElement("div");
    element.className = "control-segment";

    element.style.width =
      `${(segment.duration / totalGameTime) * 100}%`;

    element.style.background = colours[segment.leader];

    element.title =
      `${segment.leader} · ${formatControlTime(segment.duration)}`;

    segmentsContainer.appendChild(element);
  }

  for (const goal of goals) {
    const marker = document.createElement("span");
    marker.className = "control-goal-marker";

    marker.style.left =
      `${(goal.time / totalGameTime) * 100}%`;

    marker.title =
      `Goal at ${formatControlTime(goal.time)}`;

    markersContainer.appendChild(marker);
  }

  setText("#awayLeadTime", formatControlTime(totals.away));
  setText("#tiedTime", formatControlTime(totals.tied));
  setText("#homeLeadTime", formatControlTime(totals.home));
  setText("#leadChanges", leadChanges);

  if (largestLeadAmount > 0 && largestLeadTeam) {
    const leadingTeam =
      largestLeadTeam === "away"
        ? away.abbrev
        : home.abbrev;

    setText(
      "#largestLead",
      `${leadingTeam} by ${largestLeadAmount}`
    );
  } else {
    setText("#largestLead", "Tied");
  }

  if (totals.away > totals.home) {
    result.textContent =
      `${away.abbrev} led for ${formatControlTime(totals.away)}`;
  } else if (totals.home > totals.away) {
    result.textContent =
      `${home.abbrev} led for ${formatControlTime(totals.home)}`;
  } else {
    result.textContent = "Even control time";
  }

  controlBar.setAttribute(
    "aria-label",
    `${away.abbrev} led for ${formatControlTime(totals.away)}. ` +
    `The game was tied for ${formatControlTime(totals.tied)}. ` +
    `${home.abbrev} led for ${formatControlTime(totals.home)}.`
  );
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
      displayGameControl(playData);
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
