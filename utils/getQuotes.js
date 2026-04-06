const isValidQuote = require("./isValidQuote");
const truncate = require("./shortenQuote");

// Pick the 2 best quotes from a trainer's highest-scoring sessions
// Try q_liked (3.12) first — it's the most direct praise
// Fall back to q_context (1.5) if q_liked is empty
// Each quote is linked to its row_id so it's traceable back to the original data
function getQuotes(sessions, n = 2) {
  const ranked = [...sessions].sort((a, b) => b.composite - a.composite);
  const quotes = [];
  for (const s of ranked) {
    const text = isValidQuote(s.q_liked)
      ? s.q_liked
      : isValidQuote(s.q_context)
        ? s.q_context
        : null;
    if (text) quotes.push({ row_id: s.row_id, quote: truncate(text.trim()) });
    if (quotes.length === n) break;
  }
  return quotes;
}

module.exports = getQuotes;
