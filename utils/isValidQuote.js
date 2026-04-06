// Reject empty, placeholder, or NaN string values
function isValidQuote(text) {
  if (!text) return false;
  return (
    text.trim() !== "" &&
    text.trim() !== "-" &&
    text.trim().toLowerCase() !== "nan"
  );
}

module.exports = isValidQuote;
