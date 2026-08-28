export default async function handler(request, response) {
  const team = String(request.query.team || "TOR").toUpperCase();

  if (!/^[A-Z]{3}$/.test(team)) {
    return response.status(400).json({ error: "Invalid team code." });
  }

  try {
    const result = await fetch(
      `https://api-web.nhle.com/v1/roster/${team}/current`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!result.ok) throw new Error("Roster request failed");

    const data = await result.json();

    response.setHeader(
      "Cache-Control",
      "s-maxage=3600, stale-while-revalidate=86400"
    );

    return response.status(200).json(data);
  } catch {
    return response.status(502).json({
      error: "The roster is temporarily unavailable."
    });
  }
}
