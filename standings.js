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

      const teams = data.standings;

      if (!teams.length) {
        meta.textContent = "Waiting for published standings.";
        showMessage("No standings are currently available.");
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
