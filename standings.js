(() => {
  const body = document.querySelector("#standings-body");
  const meta = document.querySelector("#standings-meta");
  const caption = document.querySelector("#standings-caption");

  if (!body || !meta || !caption) return;

  function showMessage(text) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 7;
    cell.className = "standings-message";
    cell.textContent = text;

    row.append(cell);
    body.replaceChildren(row);
  }

  function seasonLabel(value) {
    const season = String(value || "");

    return /^\d{8}$/.test(season)
      ? `${season.slice(0, 4)}–${season.slice(6)}`
      : "Season not supplied";
  }

  function dateLabel(value) {
    if (!value) return "Date not supplied";

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
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

      const teams = [...data.standings];

      if (!teams.length) {
        meta.textContent = "Waiting for published standings.";
        showMessage("No standings are currently available.");
        return;
      }

      // Use NHL rankings rather than inventing our own tiebreakers.
      const ranks = teams.map(team => team.leagueSequence);
      const validRanks = ranks.every(
        rank => Number.isInteger(rank) && rank > 0
      ) && new Set(ranks).size === teams.length;

      if (validRanks) {
        teams.sort((a, b) => a.leagueSequence - b.leagueSequence);
      }

      const season = seasonLabel(teams[0].seasonId);
      const date = dateLabel(teams[0].date);

      meta.textContent = `${season} · Standings as of ${date}`;
      caption.textContent = `NHL league standings · ${season}`;

      const fragment = document.createDocumentFragment();

      teams.forEach(team => {
        const row = document.createElement("tr");

        const rank = document.createElement("td");
        rank.className = "standings-rank";
        rank.textContent = validRanks ? team.leagueSequence : "–";
        row.append(rank);

        const name = document.createElement("th");
        name.scope = "row";
        name.className = "standings-team";
        name.textContent =
          team.teamName?.default ||
          team.teamAbbrev?.default ||
          "Unknown team";
        row.append(name);

        const fields = [
          "gamesPlayed",
          "wins",
          "losses",
          "otLosses",
          "points"
        ];

        fields.forEach(field => {
          const cell = document.createElement("td");
          cell.textContent = team[field] ?? "–";

          if (field === "points") {
            cell.className = "standings-points";
          }

          row.append(cell);
        });

        fragment.append(row);
      });

      body.replaceChildren(fragment);
    } catch {
      meta.textContent = "Standings could not be loaded.";
      showMessage("Temporarily unavailable. Refresh the page to retry.");
    }
  }

  loadStandings();
})();
