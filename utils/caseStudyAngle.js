// ── 8. CASE STUDY ANGLE ───────────────────────────────────────────────────────

// One-line pitch for why be/impact should reach out to this trainer
// Tone scales with how strong the improvement signal is
function caseStudyAngle(name, improvementScore) {
  if (improvementScore >= 1.5)
    return `${name} showed the sharpest score jump in the cohort (+${improvementScore} pts) — strong evidence of rapid skill development worth capturing on record.`;
  if (improvementScore >= 0.5)
    return `${name} improved consistently across sessions (+${improvementScore} pts) — a credible growth arc that would resonate in a testimonial.`;
  if (improvementScore >= 0)
    return `${name} maintained strong scores with a positive trend — reliable, high-quality delivery worth spotlighting.`;
  return `${name} started strong and held high absolute scores — improvement score is marginal but overall performance is noteworthy.`;
}

module.exports = caseStudyAngle;
