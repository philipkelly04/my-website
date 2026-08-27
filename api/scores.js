export default async function handler(request, response) {
  try {
    const nhlResponse = await fetch(
      "https://api-web.nhle.com/v1/score/now"
    );

    if (!nhlResponse.ok) {
      throw new Error(`NHL API returned ${nhlResponse.status}`);
    }

    const data = await nhlResponse.json();

    response.setHeader(
      "Cache-Control",
      "s-maxage=60, stale-while-revalidate=300"
    );

    return response.status(200).json(data);
  } catch (error) {
    return response.status(500).json({
      error: "NHL scores are temporarily unavailable."
    });
  }
}
