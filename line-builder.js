:root {
  --background: #0b0d10;
  --panel: #15191f;
  --border: #2a3039;
  --text: #f5f7fa;
  --muted: #aab2bf;
  --team-color: #ce1126;
  --gold: #f5c542;
}

* {
  box-sizing: border-box;
}

[hidden] {
  display: none !important;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}

.line-container {
  width: min(1150px, 92%);
  margin: 36px auto;
}

.line-intro {
  margin-bottom: 28px;
  text-align: center;
}

.line-eyebrow {
  color: var(--gold);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.line-intro h1 {
  margin: 0;
  font-size: clamp(2.2rem, 7vw, 4.5rem);
}

.line-intro > p:last-child,
#lineDataNote,
#lineSelectionCount,
#lineSummaryNote {
  color: var(--muted);
  line-height: 1.6;
}

.line-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 22px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.line-toolbar > div {
  flex: 1 1 240px;
  max-width: 420px;
}

.line-toolbar label,
.line-slot label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.line-container select,
.line-container button {
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
}

.line-container select {
  width: 100%;
  min-width: 0;
  color: var(--text);
  background: #0d1015;
}

.line-container button {
  color: #111;
  background: var(--gold);
  font-weight: 800;
  cursor: pointer;
}

.line-container button:hover:not(:disabled) {
  background: #ffdc73;
}

.line-container :disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.line-container select:focus-visible,
.line-container button:focus-visible {
  outline: 3px solid var(--gold);
  outline-offset: 3px;
}

.line-status {
  margin: 20px 0;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
}

.line-team-heading {
  margin: 28px 0 20px;
  text-align: center;
}

.line-team-heading h2 {
  margin-bottom: 8px;
}

.line-rink {
  padding: 28px;
  background:
    linear-gradient(
      transparent 49.5%,
      rgba(206, 17, 38, 0.22) 49.5%,
      rgba(206, 17, 38, 0.22) 50.5%,
      transparent 50.5%
    ),
    radial-gradient(
      circle at center,
      rgba(105, 179, 231, 0.1),
      transparent 65%
    ),
    #101820;
  border: 3px solid #465365;
  border-radius: 70px;
}

.line-rink h3 {
  margin: 0 0 18px;
  color: var(--muted);
  font-size: 0.8rem;
  letter-spacing: 2px;
  text-align: center;
  text-transform: uppercase;
}

.line-rink > section + section {
  margin-top: 38px;
}

.line-forwards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.line-defence {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 70%;
  margin: 0 auto;
}

.line-slot {
  min-width: 0;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-top: 4px solid var(--team-color);
  border-radius: 12px;
}

.line-player {
  margin-top: 18px;
  text-align: center;
}

.line-number {
  display: block;
  margin-bottom: 8px;
  font-size: 2.3rem;
  font-weight: 900;
}

.line-player-name {
  margin: 0 0 8px;
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.line-player-meta,
.line-empty {
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.line-player-stats,
.line-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.line-player-stats {
  margin: 18px 0 0;
}

.line-player-stats dt {
  color: var(--muted);
  font-size: 0.7rem;
}

.line-player-stats dd {
  margin: 6px 0 0;
  font-size: 1rem;
  font-weight: 800;
}

.line-summary {
  margin-top: 24px;
  padding: 24px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.line-summary h2 {
  margin: 8px 0;
}

.line-summary-grid {
  margin: 20px 0;
}

.line-summary-grid > div {
  padding: 20px 10px;
  text-align: center;
  background: #0d1015;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.line-summary-grid dt {
  color: var(--muted);
  font-size: 0.8rem;
}

.line-summary-grid dd {
  margin: 8px 0 0;
  color: var(--gold);
  font-size: clamp(1.3rem, 4vw, 2rem);
  font-weight: 900;
}

.line-disclaimer {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .line-rink {
    padding: 20px 14px;
    border-radius: 24px;
  }

  .line-forwards,
  .line-defence {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .line-summary {
    padding: 18px;
  }
}
