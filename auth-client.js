import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(
  "https://qvmillcqdokoudtxqbiz.supabase.co",
  "sb_publishable_ij6kZwcpUEaKRIgu-XQTbQ_Jh0GtkKb",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

function returnToLogin() {
  document.querySelector("#outlookBody")?.replaceChildren();
  window.location.replace("/members.html");
  throw new Error("Membership login required.");
}

async function currentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) returnToLogin();

  return data.session;
}

export async function memberFetch(url, options = {}) {
  const session = await currentSession();
  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    returnToLogin();
  }

  return response;
}

export async function loadOutlook() {
  try {
    const session = await currentSession();

    const membership = await supabase
      .from("pucklab_memberships")
      .select("status")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (membership.error) throw membership.error;

    if (membership.data?.status !== "member") {
      returnToLogin();
    }

    const snapshot = await supabase
      .from("pucklab_outlook_snapshot")
      .select("content")
      .eq("id", 1)
      .single();

    if (snapshot.error) throw snapshot.error;

    const teamNames = {};
    const moves = {};

    const referenceSources = [
      "https://www.nhl.com/news/topic/trade-coverage/2025-26-nhl-trades",
      "https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades",
      "https://www.nhl.com/news/topic/free-agency/free-agency-signings-nhl-2026-27"
    ];

    for (const [team, entry] of Object.entries(snapshot.data.content)) {
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
        "Unable to load member access or the snapshot. Please refresh to retry.";
    }

    throw error;
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (
    event === "SIGNED_OUT" &&
    window.location.pathname === "/offseason.html"
  ) {
    document.querySelector("#outlookBody")?.replaceChildren();
    window.location.replace("/members.html");
  }
});
