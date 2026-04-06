const { parseCSV, findCol } = require("./utils/cleanData");

// ── n8n Code node — Most Improved Trainer Scout ──────────────────────────────
// Input: $input.first().json.body.csv_text  (raw CSV string sent from Bubble)
// Output: Top 2 most improved trainers as JSON

// ── 1. PARSE CSV ─────────────────────────────────────────────────────────────

// ── 2. COLUMN RESOLUTION ─────────────────────────────────────────────────────

// ── 3. CLEAN & SCORE ROWS ────────────────────────────────────────────────────

// ── 4. GROUP BY TRAINER ───────────────────────────────────────────────────────

// ── 5. ELIGIBILITY FILTER ─────────────────────────────────────────────────────

// ── 6. IMPROVEMENT SCORE ──────────────────────────────────────────────────────

// ── 7. QUOTE SELECTION ────────────────────────────────────────────────────────

// ── 9. MAIN ───────────────────────────────────────────────────────────────────

// Grab the raw CSV string from the webhook payload sent by Bubble
const fs = require("fs");
const csvText = fs.readFileSync("case-study-data.csv", "utf8");

// Run through the full pipeline
const rows = parseCSV(csvText); // raw CSV → array of row objects
const cleaned = prepareRows(rows); // add composite scores, drop bad rows
const grouped = groupByTrainer(cleaned); // group rows by trainer email

const results = [];

for (const [trainer, sessions] of Object.entries(grouped)) {
  if (!isEligible(sessions)) continue; // skip trainers who don't meet the 5 session / 7 day cliff

  const { earlyAvg, lateAvg, improvement } = improvementScore(sessions);

  // Convert email to display name: "hayden.scott@org2.example.com" → "Hayden Scott"
  const name = trainer
    .split("@")[0]
    .replace(/\./g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  results.push({
    trainer,
    trainer_name: name,
    n_sessions: sessions.length,
    early_avg: earlyAvg,
    late_avg: lateAvg,
    improvement_score: improvement,
    quotes: getQuotes(sessions),
    case_study_angle: caseStudyAngle(name, improvement),
  });
}

// Sort by improvement score descending and return the top 2
results.sort((a, b) => b.improvement_score - a.improvement_score);
const top2 = results.slice(0, 2);

console.log(JSON.stringify(top2, null, 2));
