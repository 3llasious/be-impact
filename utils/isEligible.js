// A trainer must meet both conditions to be included:
// - at least 5 sessions (so each half of the split has 2-3 sessions to average)
// - at least 7 days between first and last session (so improvement reflects genuine
//   progression, not noise from a single burst of sessions in one or two days)

function isEligible(sessions) {
  if (sessions.length < 5) return false;
  const dates = sessions.map((s) => s.date).sort((a, b) => a - b);
  const spanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
  return spanDays >= 7;
}

module.exports = isEligible;
