function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function teamName(team) {
  const place = team?.placeName?.default || "";
  const name = team?.commonName?.default || team?.name?.default || team?.abbrev || "";
  return `${place} ${name}`.trim();
}

function gameStatus(game) {
  const start = new Date(game.startTimeUTC);

  const date = start.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  if (["FINAL", "OFF"].includes(game.gameState)) {
    return `${date} · Final`;
  }

  if (["LIVE", "CRIT"].includes(game.gameState)) {
    const period = game.periodDescriptor?.number;
    const clock = game.clock?.timeRemaining;

    return [
      date,
      period ? `Live · Period ${period}` : "Live",
      clock
    ].filter(Boolean).join(" · ");
  }

  const time = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${date} · ${time}`;
}

async function loadGames() {
  const container = document.querySelector("#games-grid");

  if (!container) return;

  try {
    const response = await fetch("/api/scores");

    if (!response.ok) {
      throw new Error("Could not load scores");
    }

    const data = await response.json();

    const games = Array.isArray(data.games)
      ? data.games
      : (data.gameWeek || []).flatMap(day => day.games || []);

    if (!games.length) {
      container.innerHTML =
        '<p class="games-message">No NHL games are currently scheduled.</p>';
      return;
    }

    container.innerHTML = games.map(game => {
      const away = game.awayTeam || {};
      const home = game.homeTeam || {};

      return `
        
        <a
          class="game-card"
          href="/game.html?id=${encodeURIComponent(game.id)}"
          aria-label="Open ${escapeHtml(teamName(away))} versus ${escapeHtml(teamName(home))} Game Center"
          style="display: block; color: inherit; text-decoration: none;"
        >
          <p class="game-status">${escapeHtml(gameStatus(game))}</p>

          <div class="team">
            <img src="${escapeHtml(away.logo || "")}"
                 alt=""
                 width="48"
                 height="48">
            <span>${escapeHtml(teamName(away))}</span>
            <strong>${away.score ?? "–"}</strong>
          </div>

          <div class="team">
            <img src="${escapeHtml(home.logo || "")}"
                 alt=""
                 width="48"
                 height="48">
            <span>${escapeHtml(teamName(home))}</span>
            <strong>${home.score ?? "–"}</strong>
          </div>
                </a>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML =
      '<p class="games-message">NHL games are temporarily unavailable.</p>';
  }
}

loadGames();
