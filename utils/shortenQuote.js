// Keep quotes under 180 chars, cutting at a sentence boundary where possible
function truncate(text, max = 180) {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(".", max);
  return cut > 80 ? text.slice(0, cut + 1) : text.slice(0, max) + "…";
}

module.exports = truncate;
