import { loadOutlook, memberFetch } from "/auth-client.js";

const { teamNames, moves } = await loadOutlook();

const get = id => document.getElementById(id);

const metric = get("outlookMetric");
const status = get("outlookStatus");
const body = get("outlookBody");
const retry = get("outlookRetry");

const labels = {
  goals: "G/GP",
  points: "P/GP",
  assists: "A/GP",
  shots: "S/GP",
  hits: "Hits/GP"
};

let summary;
let realtime;
let loading = false;
let failed = false;

function node(tag, text) {
  const element = document.createElement(tag);

  if (text != null) {
    element.textContent = text;
  }

  return element;
}

function validReview(review) {
  if (
    !review ||
    !/^2026-\d{2}-\d{2}$/.test(review.asOf || "") ||
    !Number.isFinite(Date.parse(review.asOf)) ||
    !Array.isArray(review.added) ||
    !Array.isArray(review.lost) ||
    !Array.isArray(review.sources) ||
    !review.sources.length
  ) {
    return false;
  }

  const ids = [...review.added, ...review.lost];

  return (
    ids.every(id => Number.isInteger(id) && id > 0) &&
    new Set(ids).size === ids.length &&
    review.sources.every(url => {
      try {
        return new URL(url).protocol === "https:";
      } catch {
        return false;
      }
    })
  );
}

// Missing metric data makes a total incomplete.
// It is never silently treated as zero.
function total(ids, field, base, hits) {
  let sum = 0;
  let excluded = 0;
  let missing = 0;
  let included = 0;

  for (const id of ids) {
    const p = base.get(id);

    if (!p || p.gp < 10) {
      excluded++;
      continue;
    }

    const source = field === "hits" ? hits?.get(id) : p;

    if (
      !source ||
      source.gp !== p.gp ||
      !Number.isFinite(source[field])
    ) {
      missing++;
      continue;
    }

    sum += source[field] / p.gp;
    included++;
  }

  return {
    value: missing ? null : sum,
    excluded,
    missing,
    included
  };
}

function render() {
  body.replaceChildren();

  const field = metric.value;

  get("outlookCaption").textContent =
    `2026 offseason · ${labels[field]} · ` +
    "2025–26 regular-season rates";

  const teams = Object.entries(teamNames).sort(
    (a, b) => a[1].localeCompare(b[1])
  );

  for (const [team, name] of teams) {
    const tr = node("tr");
    const heading = node("th");
    heading.scope = "row";

    const identity = node("span");
    identity.className = "outlook-team";

    const logo = node("img");
    logo.src =
      `https://assets.nhle.com/logos/nhl/svg/${team}_light.svg`;
    logo.alt = "";
    logo.width = 32;
    logo.height = 32;

    logo.addEventListener("error", () => {
      logo.hidden = true;
    });

    identity.append(logo, node("span", name));
    heading.append(identity);
    tr.append(heading);

    const review = moves[team];

    let added;
    let lost;
    let message;

    if (!review) {
      message = "Awaiting review";
    } else if (!validReview(review)) {
      message = "Move list needs correction";
    } else if (
      !summary ||
      (field === "hits" && !realtime)
    ) {
      message = loading
        ? "Loading stats…"
        : "Stats unavailable — retry";
    } else {
      added = total(review.added, field, summary, realtime);
      lost = total(review.lost, field, summary, realtime);

      message =
  `${added.included} additions / ${lost.included} departures counted` +
  " · 10+ GP";

if (added.excluded + lost.excluded > 0) {
  message +=
    `; ${added.excluded + lost.excluded} listed players ` +
    "currently lack qualifying stats";
}

      if (added.missing + lost.missing) {
        message +=
          `; ${added.missing + lost.missing} ` +
          `missing ${labels[field]} values`;
      }
    }

    const net =
      added?.value != null && lost?.value != null
        ? added.value - lost.value
        : null;

    for (const value of [added?.value, lost?.value, net]) {
      const text = value == null
        ? "—"
        : Math.abs(value) < 0.005
          ? "0.00"
          : value.toFixed(2);

      tr.append(node("td", text));
    }

    if (net != null && Math.abs(net) >= 0.005) {
      const cell = tr.lastElementChild;

      if (net > 0) {
        cell.textContent = "+" + cell.textContent;
      }

      cell.className = field === "hits"
        ? "outlook-hits"
        : net > 0
          ? "outlook-plus"
          : "outlook-minus";
    }

    const coverage = node("td", message);

    if (validReview(review)) {
      const details = node("details");

      details.append(
        node("summary", `Reviewed ${review.asOf}`)
      );

      review.sources.forEach((url, index) => {
        const link = node("a", `Source ${index + 1}`);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        details.append(link);
      });

      coverage.append(details);
    }

    tr.append(coverage);
    body.append(tr);
  }
}

async function report(name) {
  async function fetchPage(page) {
    const response = await memberFetch(
  `/api/offseason-data?report=${name}&page=${page}`,
  {
    signal: AbortSignal.timeout(18000)
  }
);

    if (!response.ok) {
      throw new Error("Could not load statistics");
    }

    const data = await response.json();

    if (
      data.report !== name ||
      data.page !== page ||
      data.season !== 20252026 ||
      !Array.isArray(data.players) ||
      !Number.isInteger(data.total) ||
      data.total < 1 ||
      data.total > 2000 ||
      data.players.length !== Math.min(
        100,
        Math.max(0, data.total - page * 100)
      )
    ) {
      throw new Error("Incomplete report");
    }

    return data;
  }

  const first = await fetchPage(0);
  const result = new Map();

  function add(data) {
    if (data.total !== first.total) {
      throw new Error("Report changed while loading");
    }

    for (const p of data.players) {
      if (
        !Number.isInteger(p.id) ||
        result.has(p.id) ||
        !Number.isInteger(p.gp) ||
        p.gp < 0
      ) {
        throw new Error("Invalid or duplicate player record");
      }

      result.set(p.id, p);
    }
  }

  add(first);

  for (
    let page = 1;
    page < Math.ceil(first.total / 100);
    page++
  ) {
    add(await fetchPage(page));
  }

  if (result.size !== first.total) {
    throw new Error("Incomplete report");
  }

  return result;
}

async function load() {
  if (loading) return;

  const reviewed = Object.keys(teamNames).filter(
    team => validReview(moves[team])
  ).length;

  if (!reviewed) {
    status.textContent =
      "0 of 32 teams reviewed. " +
      "Verified offseason moves have not been entered yet.";

    render();
    return;
  }

  loading = true;
  failed = false;
  retry.disabled = true;
  metric.disabled = true;

  status.textContent =
    "Loading complete 2025–26 statistics…";

  render();

  try {
    if (!summary) {
      summary = await report("summary");
    }

    if (metric.value === "hits" && !realtime) {
      realtime = await report("realtime");
    }

    status.textContent =
      `${reviewed} of 32 teams reviewed. ` +
      "Minimum 10 games; season totals include all teams " +
      "a player represented.";
  } catch (error) {
    failed = true;

    status.textContent =
      "The complete statistics could not be loaded. " +
      "Select Retry stats.";

    console.error(error);
  } finally {
    loading = false;
    retry.disabled = false;
    metric.disabled = false;
    render();
  }
}

metric.addEventListener("change", () => {
  render();

  if (
    !summary ||
    (metric.value === "hits" && !realtime) ||
    failed
  ) {
    load();
  }
});

retry.addEventListener("click", () => {
  summary = undefined;
  realtime = undefined;
  load();
});

load();
