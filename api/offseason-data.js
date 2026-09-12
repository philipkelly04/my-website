export const config = { maxDuration: 30 };

const project = "https://qvmillcqdokoudtxqbiz.supabase.co";
const key = "sb_publishable_ij6kZwcpUEaKRIgu-XQTbQ_Jh0GtkKb";

export default async function handler(request, response) {
  for (const header of [
    "Cache-Control",
    "CDN-Cache-Control",
    "Vercel-CDN-Cache-Control"
  ]) {
    response.setHeader(header, "private, no-store");
  }

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({
      error: "GET requests only."
    });
  }

  const bearer = request.headers.authorization || "";

  if (!/^Bearer \S+$/i.test(bearer)) {
    return response.status(401).json({
      error: "Please sign in."
    });
  }

  try {
    const headers = {
      apikey: key,
      Authorization: bearer
    };

    const userResponse = await fetch(`${project}/auth/v1/user`, {
      headers,
      signal: AbortSignal.timeout(8000)
    });

    if ([401, 403].includes(userResponse.status)) {
      return response.status(401).json({
        error: "Please sign in again."
      });
    }

    if (!userResponse.ok) {
      throw new Error("Authentication unavailable");
    }

    const user = await userResponse.json();

    if (!user.id || !user.email_confirmed_at || user.is_anonymous) {
      return response.status(401).json({
        error: "Verify your email first."
      });
    }

    const membershipParams = new URLSearchParams({
      user_id: `eq.${user.id}`,
      select: "status",
      limit: "1"
    });

    const membershipResponse = await fetch(
      `${project}/rest/v1/pucklab_memberships?${membershipParams}`,
      {
        headers,
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!membershipResponse.ok) {
      throw new Error("Membership lookup unavailable");
    }

    const memberships = await membershipResponse.json();

    if (memberships[0]?.status !== "member") {
      return response.status(403).json({
        error: "Early access membership required."
      });
    }
  } catch {
    return response.status(503).json({
      error: "Unable to check membership. Please retry."
    });
  }

  const report = String(request.query.report || "summary");
  const pageText = String(request.query.page || "0");

  if (
    !["summary", "realtime"].includes(report) ||
    !/^\d{1,2}$/.test(pageText) ||
    Number(pageText) > 19
  ) {
    return response.status(400).json({
      error: "Invalid report or page."
    });
  }

  const page = Number(pageText);

  const params = new URLSearchParams({
    isAggregate: "true",
    isGame: "false",
    start: String(page * 100),
    limit: "100",
    sort: JSON.stringify([
      { property: "playerId", direction: "ASC" }
    ]),
    cayenneExp: "seasonId=20252026 and gameTypeId=2"
  });

  try {
    const result = await fetch(
      `https://api.nhle.com/stats/rest/en/skater/${report}?${params}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!result.ok) {
      throw new Error("Statistics request failed");
    }

    const data = await result.json();

    if (
      !Array.isArray(data.data) ||
      !Number.isInteger(data.total) ||
      data.total < 1 ||
      data.total > 2000 ||
      data.data.length !== Math.min(
        100,
        Math.max(0, data.total - page * 100)
      )
    ) {
      throw new Error("Incomplete statistics page");
    }

    const number = value =>
      Number.isInteger(value) && value >= 0 ? value : null;

    const players = data.data.map(p => ({
      id: p.playerId,
      gp: number(p.gamesPlayed),
      position: p.positionCode,
      goals: number(p.goals),
      assists: number(p.assists),
      points: number(p.points),
      shots: number(p.shots),
      hits: number(p.hits)
    }));

    if (
      players.some(p =>
        !Number.isInteger(p.id) ||
        p.id <= 0 ||
        p.gp === null
      )
    ) {
      throw new Error("Invalid player statistics");
    }

    return response.status(200).json({
      report,
      page,
      season: 20252026,
      total: data.total,
      players,
      fetchedAt: new Date().toISOString()
    });
  } catch {
    return response.status(502).json({
      error: "Statistics unavailable. Please retry."
    });
  }
}
