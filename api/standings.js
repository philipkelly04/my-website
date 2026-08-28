export default async function handler(request, response) {
  try {
    const result = await fetch(
      "https://api-web.nhle.com/v1/standings/now",
      { signal: AbortSignal.timeout(8000) }
    );

    if (!result.ok) {
      throw new Error("Standings request failed");
    }

    const data = await result.json();

    if (!Array.isArray(data.standings)) {
      throw new Error("Unexpected standings response");
    }

    response.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=3600"
    );

    return response.status(200).json(data);
  } catch {
    return response.status(502).json({
      error: "Standings are temporarily unavailable."
    });
  }
}
