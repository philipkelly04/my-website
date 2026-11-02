(() => {
  const body = document.querySelector("#standings-body");
  const meta = document.querySelector("#standings-meta");
  const wrapper = body?.closest(".standings-table-wrap");

  if (!body || !meta || !wrapper) return;

  const divisions = [
    { code: "A", name: "Atlantic", conference: "Eastern", color: "#69b7ff" },
    { code: "M", name: "Metropolitan", conference: "Eastern", color: "#c49bff" },
    { code: "C", name: "Central", conference: "Western", color: "#ffc76b" },
    { code: "P", name: "Pacific", conference: "Western", color: "#64d8bc" }
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showMessage(text) {
    const row = element("tr");
    const cell = element("td", "standings-message", text);
    cell.colSpan = 7;
    row.append(cell);
    body.replaceChildren(row);
  }

  function makeDivision(division, entries) {
    const card = element("section", "division-card");
    card.style.setProperty("--division-accent", division.color);

    const heading = element("div", "division-heading");
    const title = element("h3", "", division.name);
    title.id = `division-${division.code}`;

    heading.append(
      element("p", "", `${division.conference} Conference`),
      title
    );

    const scroll = element("div", "division-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-labelledby", title.id);

    const table = element("table", "standings-table division-table");
    table.setAttribute("aria-describedby", "standings-legend");

    table.append(
      element(
        "caption",
        "visually-hidden",
        `${division.name} division standings`
      )
    );

    const thead = element("thead");
    const header = element("tr");

    ["Rank", "Team", "GP", "W", "L", "OT", "PTS"].forEach(label => {
      const cell = element("th", "", label);
      cell.scope = "col";
      header.append(cell);
    });

    thead.append(header);
    table.append(thead);

    const tbody = element("tbody");
    const teams = [...entries];
    const ranks = teams.map(team => team.divisionSequence);

    const ranked = ranks.every(
      rank => Number.isInteger(rank) && rank > 0
    ) && new Set(ranks).size === teams.length;

    if (ranked) {
      teams.sort((a, b) => a.divisionSequence - b.divisionSequence);
    }

    teams.forEach(team => {
      const row = element("tr");

      row.append(
        element(
          "td",
          "standings-rank",
          ranked ? team.divisionSequence : "–"
        )
      );

      const nameCell = element("th", "standings-team");
      nameCell.scope = "row";

      const label = element("div", "standings-team-label");
      const logo = team.teamLogoDark || team.teamLogo;

      if (logo) {
        try {
          const url = new URL(logo);

          if (
            url.protocol === "https:" &&
            url.hostname === "assets.nhle.com"
          ) {
            const image = element("img", "standings-logo");
            image.src = url.href;
            image.alt = "";
            image.width = 32;
            image.height = 32;
            image.loading = "lazy";
            image.addEventListener("error", () => image.remove(), {
              once: true
            });
            label.append(image);
          }
        } catch {
          // Display the team name even if its logo URL is invalid.
        }
      }

      label.append(
        element(
          "span",
          "",
          team.teamName?.default ||
          team.teamAbbrev?.default ||
          "Unknown team"
        )
      );

      nameCell.append(label);
      row.append(nameCell);

      ["gamesPlayed", "wins", "losses", "otLosses", "points"]
        .forEach(field => {
          row.append(
            element(
              "td",
              field === "points" ? "standings-points" : "",
              team[field] ?? "–"
            )
          );
        });

      tbody.append(row);
    });

    if (!teams.length) {
      const row = element("tr");
      const cell = element(
        "td",
        "standings-message",
        "No standings available for this division."
      );
      cell.colSpan = 7;
      row.append(cell);
      tbody.append(row);
    }

    table.append(tbody);
    scroll.append(table);
    card.append(heading, scroll);

    return card;
  }


  function showDivisionPoints(teams) {
  const totals = divisions.map(division => {
    const members = teams.filter(
      team => team.divisionAbbrev === division.code
    );

    return {
      ...division,
      points: members.reduce((sum, team) => sum + team.points, 0),
      gp: members.reduce((sum, team) => sum + team.gamesPlayed, 0)
    };
  });

  // Avoid showing a misleading total if the feed is incomplete.
  const complete = divisions.every(division => {
    const members = teams.filter(
      team => team.divisionAbbrev === division.code
    );

    return members.length === 8 && members.every(team =>
      Number.isInteger(team.points) && team.points >= 0 &&
      Number.isInteger(team.gamesPlayed) && team.gamesPlayed >= 0
    );
  });

  let chart = document.querySelector("#division-points-chart");

  if (!chart) {
    chart = element("section", "division-points-chart");
    chart.id = "division-points-chart";
    chart.setAttribute("aria-labelledby", "division-points-title");
    wrapper.after(chart);
  }

  const title = element("h3", "", "Points by Division");
  title.id = "division-points-title";
  chart.replaceChildren(title);

  if (!complete) {
    chart.append(element(
      "p", "division-points-note",
      "Division totals will appear when standings are available for all 32 teams."
    ));
    return;
  }

  chart.append(element(
    "p", "division-points-note",
    "2026–27 regular season · Total points earned by each division’s eight teams."
  ));

  totals.sort((a, b) =>
    b.points - a.points || a.name.localeCompare(b.name)
  );

  const highest = Math.max(1, ...totals.map(d => d.points));

  for (const division of totals) {
    const row = element("div", "division-points-row");
    const heading = element("div", "division-points-heading");

    heading.append(
      element("strong", "", division.name),
      element("span", "", `${division.points} pts · ${division.gp} GP`)
    );

    const track = element("div", "division-points-track");
    track.setAttribute("aria-hidden", "true");

    const bar = element("div", "division-points-bar");
    bar.style.width = `${100 * division.points / highest}%`;
    bar.style.backgroundColor = division.color;

    track.append(bar);
    row.append(heading, track);
    chart.append(row);
  }
}


  function showTeamPointsByDivision(teams) {
  const totalsChart = document.querySelector("#division-points-chart");
  if (!totalsChart) return;

  let chart = document.querySelector("#team-points-chart");
  const previousDivision = chart?.querySelector("select")?.value || "M";

  if (!chart) {
    chart = element("section", "division-points-chart");
    chart.id = "team-points-chart";
    totalsChart.after(chart);
  }

  const title = element("h3", "", "Standings Pace: Games Played vs Points");
  title.id = "team-points-title";
  chart.setAttribute("aria-labelledby", title.id);

  const note = element(
    "p", "division-points-note",
    "2026–27 regular season · Above the dashed line means more than " +
    "one standings point per game. Below it means less."
  );

  const label = element("label", "", "Division: ");
  const select = element("select");
  select.add(new Option("All divisions", "all"));

  for (const div of divisions) {
    select.add(new Option(div.name, div.code));
  }

  select.value = previousDivision;
  label.append(select);

  const plot = element("div");
  const detail = element("p", "division-points-note");
  detail.setAttribute("aria-live", "polite");

  chart.replaceChildren(title, note, label, plot, detail);

  const valid = teams.filter(t =>
    Number.isInteger(t.gamesPlayed) && t.gamesPlayed >= 0 &&
    Number.isInteger(t.points) && t.points >= 0 &&
    divisions.some(d => d.code === t.divisionAbbrev)
  );

  const ns = "http://www.w3.org/2000/svg";

  function svgNode(tag, attrs, parent, text) {
    const node = document.createElementNS(ns, tag);

    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, value);
    }

    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
  }

  function describe(t) {
    const name = t.teamName?.default || t.teamAbbrev?.default || "Team";
    const diff = t.points - t.gamesPlayed;
    const pace = diff === 0
      ? "on the 1-point-per-game line"
      : `${Math.abs(diff)} ${Math.abs(diff) === 1 ? "point" : "points"} ` +
        `${diff > 0 ? "above" : "below"} pace`;

    return `${name}: ${t.gamesPlayed} GP, ${t.points} pts — ${pace}.`;
  }

  function draw() {
    plot.replaceChildren();

    const shown = valid.filter(t =>
      select.value === "all" || t.divisionAbbrev === select.value
    );

    if (!shown.length) {
      detail.textContent = "No standings are available for this selection yet.";
      return;
    }

    // Use league-wide bounds so switching divisions doesn't move the axes.
    // Zoom in around actual records, leaving space around the outer logos.
    const minGP = Math.max(0, Math.min(...valid.map(t => t.gamesPlayed)) - 2);
    const maxGP = Math.max(...valid.map(t => t.gamesPlayed)) + 2;
    const minPts = Math.max(0, Math.min(minGP, ...valid.map(t => t.points)) - 1);
    const maxPts = Math.max(maxGP, ...valid.map(t => t.points)) + 2;

    const left = 65, right = 610, top = 38, bottom = 320;
    const x = gp => left + (gp - minGP) / (maxGP - minGP) * (right - left);
    const y = pts => bottom - (pts - minPts) / (maxPts - minPts) * (bottom - top);

    const svg = svgNode("svg", {
      viewBox: "0 0 650 380",
      role: "group",
      "aria-label": "Team standings points by games played"
    }, plot);
    svg.style.cssText = "display:block;width:100%;height:auto;margin-top:12px";

    function line(x1, y1, x2, y2, extra = {}) {
      svgNode("line", {
        x1, y1, x2, y2, stroke: "#394452", ...extra
      }, svg);
    }

    function text(tx, ty, value, anchor = "middle") {
      svgNode("text", {
        x: tx, y: ty, fill: "#cbd2dc",
        "font-size": 13, "text-anchor": anchor
      }, svg, value);
    }

    const gpStep = Math.max(1, Math.ceil((maxGP - minGP) / 7));
    const ptsStep = Math.max(1, Math.ceil((maxPts - minPts) / 6));

    for (let gp = Math.ceil(minGP / gpStep) * gpStep; gp <= maxGP; gp += gpStep) {
      line(x(gp), top, x(gp), bottom);
      text(x(gp), bottom + 22, gp);
    }

    for (let pts = Math.ceil(minPts / ptsStep) * ptsStep; pts <= maxPts; pts += ptsStep) {
      line(left, y(pts), right, y(pts));
      text(left - 12, y(pts) + 4, pts, "end");
    }

    text(left, 19, "Standings points", "start");
    text((left + right) / 2, 370, "Games played");

    line(x(minGP), y(minGP), x(maxGP), y(maxGP), {
      stroke: "#f5f7fa",
      "stroke-width": 2,
      "stroke-dasharray": "7 5"
    });

    // Teams can have exactly the same GP and points. Give each its own
    // logo, with a short connector back to the shared true position.
    const groups = new Map();

    for (const team of shown) {
      const key = `${team.gamesPlayed}:${team.points}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(team);
    }

    for (const group of groups.values()) {
      const cx = x(group[0].gamesPlayed);
      const cy = y(group[0].points);
      const radius = group.length === 1 ? 0 : Math.max(18, group.length * 5);

      group.forEach((team, index) => {
        const angle = -Math.PI / 2 + index * 2 * Math.PI / group.length;
        const mx = cx + radius * Math.cos(angle);
        const my = cy + radius * Math.sin(angle);

        if (radius) line(cx, cy, mx, my, { stroke: "#aab2bf" });

        const div = divisions.find(d => d.code === team.divisionAbbrev);
        const abbr = team.teamAbbrev?.default || "?";
        const info = describe(team);

        const marker = svgNode("g", {
          transform: `translate(${mx} ${my})`,
          tabindex: 0, role: "button", "aria-label": info
        }, svg);
        marker.style.cursor = "pointer";

        svgNode("title", {}, marker, info);

        svgNode("circle", {
          r: 14, fill: "#15191f",
          stroke: div.color, "stroke-width": 3
        }, marker);

        const fallback = svgNode("text", {
          y: 3.5, fill: "white", "font-size": 8,
          "font-weight": 700, "text-anchor": "middle"
        }, marker, abbr);

        const logo = team.teamLogoDark || team.teamLogo;
        if (logo) {
          const image = svgNode("image", {
            x: -11, y: -11, width: 22, height: 22
          }, marker);
          image.addEventListener("load", () => fallback.remove());
          image.addEventListener("error", () => image.remove());
          image.setAttribute("href", logo);
        }

        const show = () => { detail.textContent = info; };
        marker.addEventListener("pointerenter", show);
        marker.addEventListener("focus", show);
        marker.addEventListener("click", show);
        marker.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            show();
          }
        });
      });
    }

    detail.textContent =
      "Tap or focus a logo for its record and points above or below pace. " +
      "Teams sharing the same spot are connected to it by a short line.";
  }

  select.addEventListener("change", draw);
  draw();
}

  
  async function loadStandings() {
    try {
      const response = await fetch("/api/standings", {
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();

      if (!Array.isArray(data.standings)) {
        throw new Error("Unexpected standings response");
      }

      const teams = data.standings.filter(
  team => String(team.seasonId) === "20262027"
);

if (!teams.length) {
  meta.textContent =
    "2026–27 regular-season standings are not published yet.";

  showMessage(
    "The division tables will appear once the NHL publishes " +
    "2026–27 standings. Preseason results do not count."
  );

  return;
}

      const seasonId = String(teams[0].seasonId || "");
      const season = /^\d{8}$/.test(seasonId)
        ? `${seasonId.slice(0, 4)}–${seasonId.slice(6)}`
        : "Season not supplied";

      const date = new Date(`${teams[0].date}T00:00:00Z`);
      const dateText = Number.isNaN(date.getTime())
        ? "Date not supplied"
        : date.toLocaleDateString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC"
          });

      const cards = divisions.map(division =>
        makeDivision(
          division,
          teams.filter(team => team.divisionAbbrev === division.code)
        )
      );

      wrapper.replaceChildren(...cards);
      showDivisionPoints(teams);
      showTeamPointsByDivision(teams);
      showStandingsPacePlot(teams);
      wrapper.className = "division-standings";
      wrapper.removeAttribute("tabindex");
      wrapper.removeAttribute("role");
      wrapper.removeAttribute("aria-labelledby");

      meta.textContent =
        `${season} · Standings as of ${dateText}`;
    } catch {
      meta.textContent = "Standings could not be loaded.";
      showMessage("Temporarily unavailable. Refresh the page to retry.");
    }
  }

  loadStandings();
})();
