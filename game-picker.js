(() => {
  const main = document.querySelector(".game-container");
  if (!main) return;

  const panel = document.createElement("section");
  panel.className = "game-picker";
  panel.setAttribute("aria-label", "Choose an NHL game");

  panel.innerHTML = `
    <h2>Choose a game</h2>

    <p>Current and upcoming games from the NHL scores feed.</p>

    <label for="gamePickerSelect">Game</label>

    <select id="gamePickerSelect" disabled>
      <option value="">Loading games…</option>
    </select>

    <button id="gamePickerOpen" type="button" disabled>
      Open game
    </button>

    <button id="gamePickerRefresh" type="button">
      Refresh list
    </button>

    <p id="gamePickerStatus" role="status"></p>
  `;

  main.prepend(panel);

  const select = panel.querySelector("select");
  const open = panel.querySelector("#gamePickerOpen");
  const refresh = panel.querySelector("#gamePickerRefresh");
  const status = panel.querySelector("#gamePickerStatus");

  const currentId = new URLSearchParams(
    location.search
  ).get("id");

  let busy = false;
  let loaded = false;

  const name = team =>
    team?.abbrev ||
    team?.commonName?.default ||
    "Team";

  async function load() {
    if (busy) return;

    busy = true;
    refresh.disabled = true;
    status.textContent = "Loading game list…";

    try {
      const data = await PuckLive.json("/api/scores");

      const games = Array.isArray(data.games)
        ? data.games
        : Array.isArray(data.gameWeek)
          ? data.gameWeek.flatMap(day => day.games || [])
          : null;

      if (!games) {
        throw new Error("Unexpected game list.");
      }

      const previous = select.value || currentId;
      const seen = new Set();

      const valid = games.filter(game => {
        const id = String(game.id);

        if (!/^\d{10}$/.test(id) || seen.has(id)) {
          return false;
        }

        seen.add(id);
        return true;
      }).sort((a, b) =>
        new Date(a.startTimeUTC) - new Date(b.startTimeUTC)
      );

      const options = valid.map(game => {
        const start = new Date(game.startTimeUTC);

        const date = Number.isNaN(start.getTime())
          ? "Date TBC"
          : start.toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit"
            });

        const state = ["FINAL", "OFF"].includes(game.gameState)
          ? "Final"
          : ["LIVE", "CRIT"].includes(game.gameState)
            ? "Live"
            : "Scheduled";

        const type = {
          1: "Preseason",
          2: "Regular season",
          3: "Playoffs"
        }[game.gameType] || "NHL";

        return new Option(
          `${date} · ${name(game.awayTeam)} at ` +
          `${name(game.homeTeam)} · ${type} · ${state}`,
          String(game.id)
        );
      });

      select.replaceChildren(
        new Option("Select a game…", ""),
        ...options
      );

      if (seen.has(previous)) {
        select.value = previous;
      }

      select.disabled = !options.length;
      open.disabled = !select.value;
      loaded = true;

      status.textContent = options.length
        ? `${options.length} games listed. Times are local to your device.`
        : "No games are listed in the current feed. Please check again later.";
    } catch (error) {
      if (!loaded) {
        select.replaceChildren(
          new Option("Games unavailable", "")
        );
      }

      status.textContent = loaded
        ? "Could not update the list. The previous list is still shown. Press Refresh list to retry."
        : "Could not load games. Press Refresh list to retry.";
    } finally {
      busy = false;
      refresh.disabled = false;
    }
  }

  select.addEventListener("change", () => {
    open.disabled = !select.value;
  });

  open.addEventListener("click", () => {
    if (/^\d{10}$/.test(select.value)) {
      location.href =
        `/game.html?id=${encodeURIComponent(select.value)}`;
    }
  });

  refresh.addEventListener("click", load);

  load();
})();
