const project = "https://qvmillcqdokoudtxqbiz.supabase.co";

const publicKey =
  "sb_publishable_ij6kZwcpUEaKRIgu-XQTbQ_Jh0GtkKb";

// Retains the existing function name without requiring membership.
export async function memberFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    cache: "no-store"
  });
}

export async function loadOutlook() {
  try {
    const response = await fetch(
      `${project}/rest/v1/pucklab_outlook_snapshot?id=eq.1&select=content`,
      {
        headers: {
          apikey: publicKey
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Unable to retrieve the Outlook snapshot.");
    }

    const rows = await response.json();
    const snapshot = rows[0]?.content;

    if (!snapshot) {
      throw new Error("The Outlook snapshot is missing.");
    }

    const teamNames = {};
    const moves = {};

    const referenceSources = [
      "https://www.nhl.com/news/topic/trade-coverage/2025-26-nhl-trades",
      "https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades",
      "https://www.nhl.com/news/topic/free-agency/free-agency-signings-nhl-2026-27"
    ];

    for (const [team, entry] of Object.entries(snapshot)) {
      teamNames[team] = entry.name;

      const sources = [...referenceSources];

      if ([...entry.added, ...entry.lost].includes(8482070)) {
        sources.push(
          "https://www.nhl.com/islanders/news/islanders-sign-chaffee"
        );
      }

      moves[team] = {
        asOf: "2026-09-10",
        snapshotDate: "2026-09-08",
        qualifyingOnly: true,
        added: entry.added,
        lost: entry.lost,
        sources
      };
    }

    return { teamNames, moves };
  } catch (error) {
    const status = document.querySelector("#outlookStatus");

    if (status) {
      status.textContent =
        "Unable to load the Outlook snapshot. Please refresh to retry.";
    }

    throw error;
  }
}
