window.PuckLive = (() => {
  async function json(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function watch({ before, label, load }) {
    if (!before) return;

    const panel = document.createElement("div");

    panel.style.cssText =
      "display:flex;align-items:center;gap:12px;" +
      "flex-wrap:wrap;margin:16px 0;color:inherit";

    const status = document.createElement("span");
    status.setAttribute("role", "status");

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Refresh";
    button.setAttribute("aria-label", `Refresh ${label}`);

    button.style.cssText =
      "padding:9px 14px;border:1px solid #566171;" +
      "border-radius:8px;background:#15191f;" +
      "color:#f5f7fa;cursor:pointer";

    panel.append(status, button);
    before.before(panel);

    let busy = false;
    let timer;
    let lastSuccess = "";
    let delay = 30000;

    async function refresh() {
      if (busy || document.hidden) return;

      clearTimeout(timer);
      busy = true;
      button.disabled = true;

      if (!lastSuccess) {
        status.textContent = `Loading ${label}…`;
      }

      try {
        delay = (await load()) || 30000;

        lastSuccess = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

        status.textContent =
          `${label}: last checked ${lastSuccess}.`;

        button.textContent = "Refresh";
      } catch (error) {
        delay = 30000;

        status.textContent = lastSuccess
  ? `${label}: update failed. Showing data last loaded ` +
    `at ${lastSuccess}. Press Retry to try again.`
  : `${label} unavailable. Press Retry to try again.`;

        button.textContent = "Retry";
        console.warn(`${label}:`, error);
      } finally {
        busy = false;
        button.disabled = false;

        
      }
    }

    button.addEventListener("click", refresh);

    

    refresh();
  }

  return { json, watch };
})();
