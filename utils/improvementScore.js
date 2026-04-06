const mean = require("./meanScore");

// Sort sessions chronologically, split into first half and second half
// improvement = late half average minus early half average
// Positive = got better, negative = got worse
function improvementScore(sessions) {
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  const mid = Math.floor(sorted.length / 2);
  const early = sorted.slice(0, mid);
  const late = sorted.slice(mid);

  const earlyAvg = mean(early.map((s) => s.composite));
  const lateAvg = mean(late.map((s) => s.composite));

  return {
    earlyAvg: Math.round(earlyAvg * 100) / 100,
    lateAvg: Math.round(lateAvg * 100) / 100,
    improvement: Math.round((lateAvg - earlyAvg) * 100) / 100,
  };
}

module.exports = improvementScore;
