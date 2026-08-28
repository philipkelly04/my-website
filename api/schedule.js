export default async function handler(request, response) {
  const team = String(request.query.team || "TOR").toUpperCase();
  const season = String(request.query.season || "now");

  if (!/^[A-Z]{3}$/.test(team)) {
    return response.status(400).json({ error: "Invalid team code." });
  }

  if (season !== "now" && !/^\d{8}$/.test(season)) {
    return response.status(400).json({ error: "Invalid season." });
  }

  try {
    const result = await fetch(
      `https://api-web.nhle.com/v1/club-schedule-season/${team}/${season}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!result.ok) throw new Error("Schedule request failed");

    const data = await result.json();

    response.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=3600"
    );

    return response.status(200).json(data);
  } catch {
    return response.status(502).json({
      error: "The schedule is temporarily unavailable."
    });
  }
}
