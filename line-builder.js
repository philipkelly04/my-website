const LINE_COLORS = {
  ANA: "#fc4c02", BOS: "#ffb81c", BUF: "#003087",
  CAR: "#cc0000", CBJ: "#002654", CGY: "#d2001c",
  CHI: "#cf0a2c", COL: "#6f263d", DAL: "#006847",
  DET: "#ce1126", EDM: "#041e42", FLA: "#c8102e",
  LAK: "#555555", MIN: "#154734", MTL: "#af1e2d",
  NJD: "#ce1126", NSH: "#ffb81c", NYI: "#00539b",
  NYR: "#0038a8", OTT: "#c52032", PHI: "#f74902",
  PIT: "#fcb514", SEA: "#008099", SJS: "#006d75",
  STL: "#002f87", TBL: "#002868", TOR: "#00205b",
  UTA: "#69b3e7", VAN: "#00205b", VGK: "#b4975a",
  WPG: "#041e42", WSH: "#c8102e"
};

const lineSlots = [
  { id: "f1", label: "Forward 1", group: "Forwards" },
  { id: "f2", label: "Forward 2", group: "Forwards" },
  { id: "f3", label: "Forward 3", group: "Forwards" },
  { id: "d1", label: "Defender 1", group: "Defence" },
  { id: "d2", label: "Defender 2", group: "Defence" }
];

const byId = id => document.getElementById(id);

const lineTeamSelect = byId("lineTeamSelect");
const lineStatus = byId("lineStatus");
const lineResults = byId("lineResults");
const clearLineButton = byId("clearLineButton");

let linePlayers = [];
let lineTeams = [];
let selections = {};
let slotControls = {};
let rosterRequest = 0;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text != null) element.textContent = text;

  return element;
}

function localText(value) {
  return typeof value === "string"
    ? value
    : value?.default || "";
}

function abbreviation(team) {
  return localText(team.teamAbbrev) || team.abbrev || "";
}

function displayTeamName(team) {
  return localText(team.teamName) || abbreviation(team);
}

function playerName(player) {
  return [player.firstName, player.lastName]
    .filter(Boolean)
    .join(" ");
}

function seasonLabel(season) {
  const text = String(season || "");

  return /^\d{8}$/.test(text)
    ? text.slice(0, 4) + "–" + text.slice(6)
    : "Season unavailable";
}

function playerRate(player, stat) {
  const games = player.current?.gamesPlayed;
  const total = player.current?.[stat];

  return (
    Number.isFinite(games) &&
    games > 0 &&
    Number.isFinite(total) &&
    total >= 0
  ) ? total / games : null;
}

function combinedRate(players, stat) {
  if (!players.length) return null;

  const season = String(players[0].season || "");

  if (
    !/^\d{8}$/.test(season) ||
    !players.every(player => String(player.season) === season)
  ) {
    return null;
  }

  const rates = players.map(player => playerRate(player, stat));

  return rates.every(Number.isFinite)
    ? rates.reduce((sum, value) => sum + value, 0)
    : null;
}

function paintPlayer(container, player) {
  container.replaceChildren();

  if (!player) {
    container.append(
      makeElement("p", "line-empty", "Choose a player above.")
    );
    return;
  }

  container.append(
    makeElement(
      "strong",
      "line-number",
      "#" + (player.sweaterNumber ?? "—")
    ),
    makeElement("h4", "line-player-name", playerName(player)),
    makeElement(
      "p",
      "line-player-meta",
      (player.position || "Skater") + " · " +
      seasonLabel(player.season) + " · GP " +
      (player.current?.gamesPlayed ?? "—")
    )
  );

  const stats = makeElement("dl", "line-player-stats");

  for (const [stat, label] of [
    ["goals", "G/GP"],
    ["points", "P/GP"],
    ["shots", "S/GP"]
  ]) {
    const item = makeElement("div");
    const value = playerRate(player, stat);

    item.append(
      makeElement("dt", "", label),
      makeElement("dd", "", value == null ? "—" : value.toFixed(2))
    );

    stats.append(item);
  }

  container.append(stats);
}

function refreshLine() {
  const selectedIds = Object.values(selections).filter(Boolean);

  for (const slot of lineSlots) {
    const { select, details } = slotControls[slot.id];

    select.value = selections[slot.id] || "";

    for (const option of select.options) {
      option.disabled =
        Boolean(option.value) &&
        selectedIds.includes(option.value) &&
        option.value !== select.value;
    }

    paintPlayer(
      details,
      linePlayers.find(
        player => String(player.playerId) === select.value
      )
    );
  }

  const chosen = selectedIds.map(id =>
    linePlayers.find(player => String(player.playerId) === id)
  ).filter(Boolean);

  byId("lineSelectionCount").textContent =
    chosen.length + " of 5 players selected";

  for (const [stat, id] of [
    ["goals", "lineGoalsRate"],
    ["points", "linePointsRate"],
    ["shots", "lineShotsRate"]
  ]) {
    const total = combinedRate(chosen, stat);

    byId(id).textContent =
      total == null ? "—" : total.toFixed(2);
  }

  const missing = chosen.length &&
    ["goals", "points", "shots"].some(
      stat => combinedRate(chosen, stat) == null
    );

  byId("lineSummaryNote").textContent = !chosen.length
    ? "Select players to see their combined individual rates."
    : missing
      ? "Some totals are unavailable: stats must be complete and from the same season."
      : "Totals cover the " + chosen.length +
        " selected players only. " +
        seasonLabel(chosen[0].season) + " regular-season rates.";

  clearLineButton.disabled = !chosen.length;
}

function buildSlots() {
  byId("lineForwards").replaceChildren();
  byId("lineDefence").replaceChildren();

  slotControls = {};

  for (const slot of lineSlots) {
    const card = makeElement("article", "line-slot");
    const label = makeElement("label", "", slot.label);
    const select = makeElement("select");

    select.id = "line-slot-" + slot.id;
    label.htmlFor = select.id;

    const placeholder = makeElement(
      "option", "", "Choose a player"
    );

    placeholder.value = "";
    select.append(placeholder);

    for (const player of linePlayers.filter(
      player => player.group === slot.group
    )) {
      const option = makeElement(
        "option",
        "",
        "#" + (player.sweaterNumber ?? "—") +
        " " + playerName(player)
      );

      option.value = String(player.playerId);
      select.append(option);
    }

    const details = makeElement("div", "line-player");

    card.append(label, select, details);

    byId(
      slot.group === "Forwards"
        ? "lineForwards"
        : "lineDefence"
    ).append(card);

    slotControls[slot.id] = { select, details };

    select.addEventListener("change", () => {
      const duplicate = Object.entries(selections).some(
        ([id, value]) =>
          id !== slot.id &&
          value &&
          value === select.value
      );

      if (!duplicate) {
        selections[slot.id] = select.value;
      }

      refreshLine();
    });
  }

  refreshLine();
}

async function getJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }

  return response.json();
}

async function loadLineTeam() {
  const requestId = ++rosterRequest;
  const team = lineTeamSelect.value;

  selections = {};
  lineResults.hidden = true;
  clearLineButton.disabled = true;
  lineStatus.textContent = "Loading " + team + " players…";

  try {
    const data = await getJson(
      "/api/player-lab?team=" + encodeURIComponent(team)
    );

    if (requestId !== rosterRequest) return;

    if (!Array.isArray(data.players)) {
      throw new Error("Missing roster");
    }

    const seen = new Set();

    linePlayers = data.players.filter(player => {
      const id = String(player.playerId || "");

      if (
        !/^\d+$/.test(id) ||
        seen.has(id) ||
        !["Forwards", "Defence"].includes(player.group)
      ) {
        return false;
      }

      seen.add(id);
      return true;
    }).sort(
      (a, b) =>
        (a.sweaterNumber ?? 999) - (b.sweaterNumber ?? 999)
    );

    if (!linePlayers.length) {
      throw new Error("No skaters available");
    }

    const teamInfo = lineTeams.find(
      item => abbreviation(item) === team
    );

    byId("lineTeamName").textContent = teamInfo
      ? displayTeamName(teamInfo)
      : team;

    byId("lineDataNote").textContent =
      "Current roster · Season shown on each player card. " +
      "Individual season totals may include time with other teams.";

    document.documentElement.style.setProperty(
      "--team-color",
      LINE_COLORS[team] || "#69b3e7"
    );

    buildSlots();

    lineResults.hidden = false;
    lineStatus.textContent =
      "Choose three forwards and two defenders.";
  } catch (error) {
    if (requestId !== rosterRequest) return;

    console.error("Line builder:", error);

    lineStatus.textContent =
      "Players could not be loaded. " +
      "Choose another team or refresh to retry.";
  }
}

async function startLineBuilder() {
  lineStatus.textContent = "Loading NHL teams…";

  try {
    const data = await getJson("/api/standings");

    const teams = Array.isArray(data.standings)
      ? data.standings
      : Array.isArray(data)
        ? data
        : [];

    lineTeams = teams.filter(team => abbreviation(team))
      .sort((a, b) =>
        displayTeamName(a).localeCompare(displayTeamName(b))
      );

    if (!lineTeams.length) {
      throw new Error("No teams available");
    }

    lineTeamSelect.replaceChildren();

    for (const team of lineTeams) {
      const option = makeElement(
        "option", "", displayTeamName(team)
      );

      option.value = abbreviation(team);
      lineTeamSelect.append(option);
    }

    lineTeamSelect.value = lineTeams.some(
      team => abbreviation(team) === "NJD"
    ) ? "NJD" : abbreviation(lineTeams[0]);

    lineTeamSelect.disabled = false;

    await loadLineTeam();
  } catch (error) {
    console.error("Line builder setup:", error);

    lineStatus.textContent =
      "Teams could not be loaded. Please refresh to retry.";
  }
}

lineTeamSelect.addEventListener("change", loadLineTeam);

clearLineButton.addEventListener("click", () => {
  selections = {};
  refreshLine();
});

startLineBuilder();
