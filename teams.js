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

  select.value = "TOR";
  select.disabled = false;

  function renderSchedule(data, selectedTeam) {
    if (!Array.isArray(data.games)) {
      throw new Error("Unexpected schedule response");
    }

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

  function renderRoster(data) {
    const groups = [
      ["Forwards", data.forwards],
      ["Defensemen", data.defensemen],
      ["Goalies", data.goalies]
    ];

    if (!groups.some(([, players]) => Array.isArray(players))) {
      throw new Error("Unexpected roster response");
    }

    const fragment = document.createDocumentFragment();

    groups.forEach(([label, players]) => {
      const group = element("section", "roster-group");
      group.append(element("h4", "", label));

      if (!players?.length) {
        group.append(element("p", "", "No players listed."));
      } else {
        const list = element("ul", "roster-list");

        players.forEach(player => {
          const name = [
            player.firstName?.default,
            player.lastName?.default
          ].filter(Boolean).join(" ");

          const row = element("li", "roster-row");

          row.append(
            element(
              "span",
              "player-number",
              player.sweaterNumber == null
                ? "–"
                : `#${player.sweaterNumber}`
            ),
            element("strong", "player-name", name || "Name unavailable"),
            element("span", "player-position", player.positionCode || "")
          );

          list.append(row);
        });

        group.append(list);
      }

      fragment.append(group);
    });

    return fragment;
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

  async function loadTeam() {
    const number = ++requestNumber;
    const team = select.value;

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
