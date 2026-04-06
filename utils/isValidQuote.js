// Reject empty, placeholder, or NaN string values
function isValidQuote(text) {
  return (
    text &&
    text.trim() !== "" &&
    text.trim() !== "-" &&
    text.trim().toLowerCase() !== "nan"
  );
}

module.exports = isValidQuote;
