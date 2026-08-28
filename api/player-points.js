export default async function handler(request, response) {
  // Use one consistent timezone for the season switch.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const part = type => parts.find(item => item.type === type).value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;

  const season =
    today >= "2026-09-30" ? "20262027" : "20252026";

  const seasonLabel =
    `${season.slice(0, 4)}–${season.slice(6)}`;

  // Prevent an old-season response being cached across the switch.
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await fetch(
      `https://api-web.nhle.com/v1/skater-stats-leaders/${season}/2?categories=points&limit=-1`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (result.status === 404) {
      return response.status(200).json({
        season,
        seasonLabel,
        status: "unavailable",
        points: [],
        message: "Regular-season stats are not available yet."
      });
    }

    if (!result.ok) {
      throw new Error("Player stats request failed");
    }

    const data = await result.json();

    if (!Array.isArray(data.points)) {
      throw new Error("Unexpected player stats response");
    }

    return response.status(200).json({
      season,
      seasonLabel,
      status: data.points.length ? "ready" : "unavailable",
      points: data.points
    });
  } catch {
    return response.status(502).json({
      season,
      seasonLabel,
      status: "error",
      error: "Player statistics are temporarily unavailable."
    });
  }
}
