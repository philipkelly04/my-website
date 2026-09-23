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

let scoresHaveLoaded = false;

async function loadGames() {
  const container = document.querySelector("#games-grid");

  try {
    const data = await PuckLive.json("/api/scores");

    const games = Array.isArray(data.games)
      ? data.games
      : Array.isArray(data.gameWeek)
        ? data.gameWeek.flatMap(day => day.games || [])
        : null;

    if (!games) {
      throw new Error("Unexpected scores response.");
    }

    const markup = games.map(game => {
      const away = game.awayTeam || {};
      const home = game.homeTeam || {};

      return `
        <a
          class="game-card"
          href="/game.html?id=${encodeURIComponent(game.id)}"
          aria-label="Open ${escapeHtml(teamName(away))} versus ${escapeHtml(teamName(home))} Game Center"
          style="display:block;color:inherit;text-decoration:none;"
        >
          <p class="game-status">
            ${escapeHtml(gameStatus(game))}
          </p>

          <div class="team">
            <img
              src="${escapeHtml(away.logo || "")}"
              alt=""
              width="48"
              height="48"
            >
            <span>${escapeHtml(teamName(away))}</span>
            <strong>${escapeHtml(away.score ?? "–")}</strong>
          </div>

          <div class="team">
            <img
              src="${escapeHtml(home.logo || "")}"
              alt=""
              width="48"
              height="48"
            >
            <span>${escapeHtml(teamName(home))}</span>
            <strong>${escapeHtml(home.score ?? "–")}</strong>
          </div>
        </a>
      `;
    }).join("");

    // Avoid rebuilding unchanged cards on every refresh.
    if (container.innerHTML !== markup && games.length) {
      container.innerHTML = markup;
    }

    if (!games.length) {
      container.innerHTML =
        '<p class="games-message">' +
        'No games are currently listed. Check back soon.' +
        '</p>';
    }

    scoresHaveLoaded = true;

    const live = games.some(game =>
      ["LIVE", "CRIT"].includes(game.gameState)
    );

    return live ? 30000 : 60000;
  } catch (error) {
    if (!scoresHaveLoaded) {
      container.innerHTML =
        '<p class="games-message">' +
        'Games could not be loaded. Use Retry above.' +
        '</p>';
    }

    // Keep existing cards if a later update fails.
    throw error;
  }
}

PuckLive.watch({
  before: document.querySelector("#games-grid"),
  label: "NHL games",
  load: loadGames
});
