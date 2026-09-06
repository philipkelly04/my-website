(() => {
  const root = document.getElementById("teamDepth");
  if (!root) return;

  const get = id => document.getElementById(id);

  const season = get("depthSeason");
  const minimum = get("depthMinimum");
  const position = get("depthPosition");
  const order = get("depthOrder");
  const body = get("depthBody");
  const status = get("depthStatus");
  const retry = get("depthRetry");
  const detail = get("depthDetails");

  const labels = [
    "1.0+",
    "0.9–<1.0",
    "0.8–<0.9",
    "0.7–<0.8",
    "0.6–<0.7",
    "0.5–<0.6",
    "0.4–<0.5",
    "0.3–<0.4",
    "0.2–<0.3",
    "0.1–<0.2",
    ">0–<0.1",
    "Zero goals",
    "Below min GP",
    "No data"
  ];

  let teams = [];
  let stats = new Map();
  let rosters = new Map();
  let errors = new Set();
  let controller;
  let observer;
  let version = 0;
  let loadedSeason = "";

  const el = (tag, text) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  };

  const seasonName = value =>
    value.slice(0, 4) + "–" + value.slice(6);

  function bucket(player, minGP) {
    if (
      !Number.isFinite(player.gp) ||
      player.gp <= 0 ||
      !Number.isFinite(player.goals)
    ) {
      return 13;
    }

    if (player.gp < minGP) return 12;
    if (player.goals === 0) return 11;

    // Use the exact ratio, not a rounded display value.
    return 10 - Math.min(
      10,
      Math.floor((player.goals * 10) / player.gp)
    );
  }

  function rowData(team) {
    const groups = Array.from(
      { length: labels.length },
      () => []
    );

    const roster = rosters.get(team.abbrev);

    const players = (roster?.players || [])
      .filter(player =>
        position.value === "all" ||
        (
          position.value === "D"
            ? player.position === "D"
            : player.position !== "D"
        )
      )
      .map(player => ({
        ...player,
        gp: stats.get(player.id)?.gp,
        goals: stats.get(player.id)?.goals
      }));

    players.forEach(player => {
      groups[bucket(player, Number(minimum.value))].push(player);
    });

    return {
      ...team,
      groups,
      players,
      ready: Boolean(roster)
    };
  }

  function showPlayers(row, index) {
    detail.hidden = false;
    detail.open = true;

    get("depthDetailTitle").textContent =
      `${row.name} · ${labels[index]} · ${seasonName(loadedSeason)}`;

    const list = get("depthPlayerList");
    list.replaceChildren();

    const players = [...row.groups[index]].sort((a, b) =>
      (
        (b.gp > 0 ? b.goals / b.gp : -1) -
        (a.gp > 0 ? a.goals / a.gp : -1)
      ) || a.name.localeCompare(b.name)
    );

    for (const player of players) {
      const item = el("li");

      item.append(
        el("strong", `#${player.number ?? "—"} ${player.name}`)
      );

      item.append(
        el(
          "span",
          player.gp > 0
            ? ` ${player.goals} goals / ${player.gp} GP · ` +
              `${(player.goals / player.gp).toFixed(3)} G/GP`
            : " No regular-season statistics available for this season."
        )
      );

      list.append(item);
    }

    get("depthDetailTitle").focus();
  }

  function render() {
    const rows = teams.map(rowData);

    rows.sort((a, b) => {
      if (a.ready !== b.ready) return a.ready ? -1 : 1;

      if (order.value !== "name") {
        const end = order.value === "0.3" ? 8 : 9;

        const score = row =>
          row.groups.slice(0, end).reduce(
            (sum, group) => sum + group.length,
            0
          );

        const difference = score(b) - score(a);
        if (difference) return difference;
      }

      return a.name.localeCompare(b.name);
    });

    body.replaceChildren();

    for (const row of rows) {
      const tr = el("tr");
      const heading = el("th");
      heading.scope = "row";

      const link = el("a");
      link.href =
        `/players.html?team=${encodeURIComponent(row.abbrev)}`;

      const logo = el("img");
      logo.src =
        `https://assets.nhle.com/logos/nhl/svg/${row.abbrev}_light.svg`;
      logo.alt = "";
      logo.width = 28;
      logo.height = 28;

      logo.addEventListener("error", () => {
        logo.hidden = true;
      });

      link.append(logo, el("span", row.name));
      heading.append(link);
      tr.append(heading);

      if (!row.ready) {
        const td = el(
          "td",
          errors.has(row.abbrev)
            ? "Roster unavailable — use Reload table"
            : "Loading roster…"
        );

        td.colSpan = labels.length + 1;
        tr.append(td);
      } else {
        tr.append(el("td", row.players.length));

        row.groups.forEach((players, index) => {
          const td = el("td");

          if (players.length) {
            const button = el("button", players.length);
            button.type = "button";

            button.setAttribute(
              "aria-label",
              `${row.name}: ${players.length} players, ` +
              `${labels[index]}. View players.`
            );

            if (index < 11) {
              td.style.backgroundColor =
                `rgba(245,197,66,${Math.min(0.4, players.length * 0.06)})`;
            }

            button.addEventListener("click", () => {
              showPlayers(row, index);
            });

            td.append(button);
          } else {
            td.textContent = "0";
            td.className = "depth-zero";
          }

          tr.append(td);
        });
      }

      body.append(tr);
    }
  }

  async function json(url, signal) {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
  }

  async function pool(items, task) {
    let index = 0;

    await Promise.all(
      Array.from(
        { length: Math.min(3, items.length) },
        async () => {
          while (index < items.length) {
            await task(items[index++]);
          }
        }
      )
    );
  }

  async function load() {
    observer?.disconnect();
    controller?.abort();

    controller = new AbortController();

    const signal = controller.signal;
    const run = ++version;
    const selectedSeason = season.value;

    teams = [];
    stats = new Map();
    rosters = new Map();
    errors = new Set();

    body.replaceChildren();
    detail.hidden = true;
    retry.disabled = true;

    status.textContent = "Loading complete league statistics…";

    let pages;

    try {
      const base =
        `/api/depth-data?kind=stats&season=${selectedSeason}&page=`;

      const first = await json(base + "0", signal);

      if (run !== version) return;

      if (
        !Array.isArray(first.teams) ||
        first.teams.length !== 32 ||
        !Number.isInteger(first.total) ||
        first.total < 0 ||
        first.total > 5000
      ) {
        throw new Error("Incomplete team or player list");
      }

      teams = first.teams;
      loadedSeason = selectedSeason;
      render();

      pages = [first];

      const remaining = Array.from(
        {
          length: Math.max(
            0,
            Math.ceil(first.total / 100) - 1
          )
        },
        (_, index) => index + 1
      );

      await pool(remaining, async page => {
        pages.push(await json(base + page, signal));
      });

      if (run !== version) return;

      const records = pages.flatMap(page => {
        if (
          page.total !== first.total ||
          page.season !== selectedSeason ||
          !Array.isArray(page.players)
        ) {
          throw new Error(
            "Statistics changed while loading; reload the table"
          );
        }

        return page.players;
      });

      stats = new Map(
        records.map(player => [player.id, player])
      );

      if (
        records.length !== first.total ||
        stats.size !== first.total
      ) {
        throw new Error("Incomplete or duplicate statistics pages");
      }

      await pool(teams, async team => {
        try {
          const data = await json(
            `/api/depth-data?kind=roster&team=${team.abbrev}`,
            signal
          );

          if (run !== version) return;

          if (
            data.team !== team.abbrev ||
            !Array.isArray(data.players) ||
            !data.players.length
          ) {
            throw new Error("Incomplete roster");
          }

          rosters.set(team.abbrev, data);
        } catch (error) {
          if (signal.aborted) throw error;
          errors.add(team.abbrev);
        }

        if (run !== version) return;

        render();

        status.textContent =
          `${rosters.size} of 32 rosters loaded` +
          (
            errors.size
              ? ` · ${errors.size} unavailable`
              : ""
          ) + "…";
      });

      if (run !== version) return;

      const fetchedAt = pages
        .map(page => page.fetchedAt)
        .sort()[0];

      status.textContent =
        `${seasonName(selectedSeason)} regular season · ` +
        `${rosters.size}/32 current rosters loaded. ` +
        (
          first.total === 0
            ? "No regular-season statistics are available yet. "
            : ""
        ) +
        (
          errors.size
            ? "Some rosters failed; use Reload table to retry. "
            : ""
        ) +
        `Stats retrieved ${new Date(fetchedAt).toLocaleString()}.`;
    } catch (error) {
      if (run !== version) return;

      controller.abort();
      teams = [];
      body.replaceChildren();
      detail.hidden = true;

      status.textContent =
        "The complete depth table could not be loaded. " +
        "Use Reload table to retry.";

      console.error("Depth table:", error);
    } finally {
      if (run === version) retry.disabled = false;
    }
  }

  const heading = el("tr");

  ["Team", "Skaters", ...labels].forEach(label => {
    const th = el("th", label);
    th.scope = "col";
    heading.append(th);
  });

  get("depthHead").append(heading);

  season.value =
    Date.now() >= Date.parse("2026-09-30T00:00:00Z")
      ? "20262027"
      : "20252026";

  season.addEventListener("change", load);

  [minimum, position, order].forEach(control => {
    control.addEventListener("change", () => {
      detail.hidden = true;
      render();
    });
  });

  retry.addEventListener("click", load);

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        load();
      }
    }, { rootMargin: "300px" });

    observer.observe(root);
  } else {
    load();
  }
})();
