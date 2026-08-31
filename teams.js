(() => {
  const SEASON = "20262027";

  const teams = {
    ANA: "Anaheim Ducks",
    BOS: "Boston Bruins",
    BUF: "Buffalo Sabres",
    CGY: "Calgary Flames",
    CAR: "Carolina Hurricanes",
    CHI: "Chicago Blackhawks",
    COL: "Colorado Avalanche",
    CBJ: "Columbus Blue Jackets",
    DAL: "Dallas Stars",
    DET: "Detroit Red Wings",
    EDM: "Edmonton Oilers",
    FLA: "Florida Panthers",
    LAK: "Los Angeles Kings",
    MIN: "Minnesota Wild",
    MTL: "Montréal Canadiens",
    NSH: "Nashville Predators",
    NJD: "New Jersey Devils",
    NYI: "New York Islanders",
    NYR: "New York Rangers",
    OTT: "Ottawa Senators",
    PHI: "Philadelphia Flyers",
    PIT: "Pittsburgh Penguins",
    SJS: "San Jose Sharks",
    SEA: "Seattle Kraken",
    STL: "St. Louis Blues",
    TBL: "Tampa Bay Lightning",
    TOR: "Toronto Maple Leafs",
    UTA: "Utah Mammoth",
    VAN: "Vancouver Canucks",
    VGK: "Vegas Golden Knights",
    WSH: "Washington Capitals",
    WPG: "Winnipeg Jets"
  };

  const select = document.querySelector("#team-select");
  const schedule = document.querySelector("#team-schedule");
  const roster = document.querySelector("#team-roster");
  const status = document.querySelector("#team-status");

  if (!select || !schedule || !roster || !status) return;

  // Create elements safely without inserting API data as HTML.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function message(container, text) {
    container.replaceChildren(element("p", "games-message", text));
  }

  select.replaceChildren();

  Object.entries(teams)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([code, name]) => {
      select.add(new Option(name, code));
    });

  select.value = "NJD";
  select.disabled = false;

  function renderSchedule(data, selectedTeam) {
    if (!Array.isArray(data.games)) {
      throw new Error("Unexpected schedule response");
    }
  updateScheduleBrand(selectedTeam, data.games);
    const list = element("ul", "schedule-list");

    const games = [...data.games].sort(
      (a, b) => new Date(a.startTimeUTC) - new Date(b.startTimeUTC)
    );

    if (!games.length) {
      return element(
        "p",
        "games-message",
        "No games have been published for this season yet."
      );
    }

    games.forEach(game => {
      const home = game.homeTeam || {};
      const away = game.awayTeam || {};
      const isHome = home.abbrev === selectedTeam;
      const opponent = isHome ? away : home;
      const start = new Date(game.startTimeUTC);
      const validDate = !Number.isNaN(start.getTime());

      const date = validDate
        ? start.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
          })
        : game.gameDate || "Date to be confirmed";

      let detail = validDate
        ? start.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
          })
        : "Time to be confirmed";

      if (["FINAL", "OFF"].includes(game.gameState)) {
        detail =
          `Final: ${away.abbrev} ${away.score ?? "–"} · ` +
          `${home.abbrev} ${home.score ?? "–"}`;
      } else if (["LIVE", "CRIT"].includes(game.gameState)) {
        detail =
          `Live: ${away.abbrev} ${away.score ?? "–"} · ` +
          `${home.abbrev} ${home.score ?? "–"}`;
      }

      if (game.gameScheduleState === "PPD") {
        detail = "Postponed";
      } else if (game.gameScheduleState === "CNCL") {
        detail = "Cancelled";
      }

      const gameType = {
        1: "Preseason",
        2: "Regular season",
        3: "Playoffs"
      }[game.gameType] || "";

      const row = element("li", "schedule-row");

      row.append(
        element("span", "schedule-date", date),
        element(
          "strong",
          "schedule-opponent",
          `${isHome ? "vs" : "@"} ${
            teams[opponent.abbrev] || opponent.abbrev || "TBD"
          }`
        ),
        element(
          "span",
          "schedule-detail",
          [gameType, detail].filter(Boolean).join(" · ")
        )
      );

      list.append(row);
    });

    return list;
  }

  let playerPointsPromise = null;

function renderRoster(data) {
  const keys = ["forwards", "defensemen", "goalies"];

  if (!keys.some(key => Array.isArray(data[key]))) {
    throw new Error("Unexpected roster response");
  }

  const players = key => Array.isArray(data[key]) ? data[key] : [];
  const skaters = [...players("forwards"), ...players("defensemen")];
  const goalies = players("goalies");

  const content = element("div", "roster-content");
  const note = element(
    "p",
    "roster-stats-note",
    "Loading regular-season points…"
  );
  note.setAttribute("role", "status");

  const skaterGroup = element("section", "roster-group");
  const skaterList = element("ul", "roster-list");

  skaterGroup.append(
    element("h4", "", "Skaters · Highest points first"),
    skaterList
  );

  function playerName(player) {
    return [
      player.firstName?.default,
      player.lastName?.default
    ].filter(Boolean).join(" ") || "Name unavailable";
  }

  function playerRow(player, points, showPoints) {
    const row = element(
      "li",
      showPoints ? "roster-row has-points" : "roster-row"
    );

    row.append(
      element(
        "span",
        "player-number",
        player.sweaterNumber == null
          ? "–"
          : `#${player.sweaterNumber}`
      ),
      element("strong", "player-name", playerName(player)),
      element("span", "player-position", player.positionCode || "")
    );

    if (showPoints) {
      const badge = element(
        "strong",
        "player-points",
        `${points ?? "—"} PTS`
      );
      badge.title = points == null
        ? "Points not available"
        : `${points} regular-season points`;

      row.append(badge);
    }

    return row;
  }

  function displaySkaters(points = new Map()) {
    const sorted = [...skaters].sort((a, b) => {
      const aPoints = points.get(String(a.id)) ?? -1;
      const bPoints = points.get(String(b.id)) ?? -1;

      return bPoints - aPoints ||
        playerName(a).localeCompare(playerName(b));
    });

    skaterList.replaceChildren();

    if (!sorted.length) {
      skaterList.append(
        element("li", "games-message", "No skaters listed.")
      );
      return;
    }

    sorted.forEach(player => {
      skaterList.append(
        playerRow(player, points.get(String(player.id)), true)
      );
    });
  }

  displaySkaters();

  const goalieGroup = element("section", "roster-group");
  const goalieList = element("ul", "roster-list");

  goalieGroup.append(element("h4", "", "Goalies"), goalieList);

  goalies.forEach(player => {
    goalieList.append(playerRow(player, null, false));
  });

  if (!goalies.length) {
    goalieList.append(
      element("li", "games-message", "No goalies listed.")
    );
  }

  content.append(note, skaterGroup, goalieGroup);

  // Fetch points once per page load, then reuse for other teams.
  if (!playerPointsPromise) {
    playerPointsPromise = fetch("/api/player-points", {
      signal: AbortSignal.timeout(15000)
    })
      .then(response => {
        if (!response.ok) throw new Error("Points request failed");
        return response.json();
      })
      .catch(() => null);
  }

  playerPointsPromise.then(stats => {
    if (!stats || stats.status === "error") {
      note.textContent =
        "Points temporarily unavailable. Refresh the page to retry.";
      return;
    }

    if (stats.status === "unavailable") {
      note.textContent =
        `${stats.seasonLabel} regular-season stats are not available yet.`;
      return;
    }

    if (!Array.isArray(stats.points)) {
      note.textContent = "Player points could not be read.";
      return;
    }

    const points = new Map();

    stats.points.forEach(player => {
      if (
        player.id != null &&
        typeof player.value === "number" &&
        Number.isFinite(player.value) &&
        player.value >= 0
      ) {
        points.set(String(player.id), player.value);
      }
    });

    displaySkaters(points);

    note.textContent =
      `${stats.seasonLabel} regular-season NHL points · ` +
      "Highest first · — means no data available.";
  });

  return content;
}

  // Prevent an older request overwriting a newly selected team.
  let requestNumber = 0;

  async function loadPanel(url, container, render, number) {
    try {
      const response = await fetch(url);

      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();

      if (number !== requestNumber) return false;

      container.replaceChildren(render(data));
      return true;
    } catch {
      if (number === requestNumber) {
        message(
          container,
          "Temporarily unavailable. Select the team again to retry."
        );
      }

      return false;
    }
  }

function updateScheduleBrand(code, games = []) {
  const header = document.querySelector("#schedule-title");
  if (!header) return;

  const colors = {
    ANA: "#F47A38",
    BOS: "#FFB81C",
    BUF: "#003087",
    CGY: "#C8102E",
    CAR: "#CC0000",
    CHI: "#CF0A2C",
    COL: "#6F263D",
    CBJ: "#002654",
    DAL: "#006847",
    DET: "#CE1126",
    EDM: "#FF4C00",
    FLA: "#C8102E",
    LAK: "#555555",
    MIN: "#154734",
    MTL: "#AF1E2D",
    NSH: "#FFB81C",
    NJD: "#CE1126",
    NYI: "#00539B",
    NYR: "#0038A8",
    OTT: "#C52032",
    PHI: "#F74902",
    PIT: "#FFB81C",
    SJS: "#006D75",
    SEA: "#68A2B9",
    STL: "#002F87",
    TBL: "#002868",
    TOR: "#00205B",
    UTA: "#6CACE4",
    VAN: "#00205B",
    VGK: "#B4975A",
    WSH: "#C8102E",
    WPG: "#041E42"
  };

  header.classList.add("team-branded-header");
  header.style.setProperty("--team-color", colors[code] || "#555");

  const labels = element("span", "team-brand-labels");

  labels.append(
    element("span", "team-brand-name", teams[code] || code),
    element(
      "span",
      "team-brand-subtitle",
      `${SEASON.slice(0, 4)}–${SEASON.slice(6)} Schedule`
    )
  );

  header.replaceChildren();

  // Use the logo supplied by the NHL schedule.
  const teamData = games
    .flatMap(game => [game.homeTeam, game.awayTeam])
    .find(team => team?.abbrev === code);

  const logo = teamData?.darkLogo || teamData?.logo;

  if (logo) {
    try {
      const url = new URL(logo);

      if (
        url.protocol === "https:" &&
        url.hostname === "assets.nhle.com"
      ) {
        const image = element("img", "team-brand-logo");
        image.src = url.href;
        image.alt = "";
        image.width = 56;
        image.height = 56;

        image.addEventListener("error", () => image.remove(), {
          once: true
        });

        header.append(image);
      }
    } catch {
      // Keep the team name visible if its logo is unavailable.
    }
  }

  header.append(labels);
}

  
  async function loadTeam() {
    const number = ++requestNumber;
    const team = select.value;
updateScheduleBrand(team);
    status.textContent = `Loading ${teams[team]}…`;
    message(schedule, "Loading schedule…");
    message(roster, "Loading roster…");

    const results = await Promise.all([
      loadPanel(
        `/api/schedule?team=${team}&season=${SEASON}`,
        schedule,
        data => renderSchedule(data, team),
        number
      ),
      loadPanel(
        `/api/roster?team=${team}`,
        roster,
        renderRoster,
        number
      )
    ]);

    if (number !== requestNumber) return;

    status.textContent = results.every(Boolean)
      ? `${teams[team]} loaded. Game times are shown in your local timezone.`
      : "Some information could not load. Switch teams and try again.";
  }

  select.addEventListener("change", loadTeam);
  loadTeam();
})();
