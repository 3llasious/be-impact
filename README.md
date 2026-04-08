# Most Improved Trainer Scout

Hello Fabien, please see details of the CSV parser below.

## Getting Started

To install dependencies:

```bash
npm install
```

To run the script:

```bash
npm start
```

This runs `analyse.js` (the main controller file) against `case-study-data.csv` and writes the results to `output.json`.

To run the test suite:

```bash
npm test
```

This runs all tests in `__tests__/tests.js` via Jest, covering every helper function in the pipeline.

---

## What it does

Takes a CSV of learner feedback and returns the Top 2 most improved trainers, with quotes and a case study angle for each.

---

## Order of Execution

### 1. Parse CSV

Reads the raw CSV string line by line. Uses a quote-aware parser to correctly handle column names that contain commas inside quoted fields — a naive `split(',')` would misalign every column to the right of the first quoted header.

### 2. Column Resolution

Matches column names by prefix rather than exact string. This is necessary because the CSV contains unicode apostrophes in some column names that don't match regular quote characters.

### 3. Clean & Score Rows

Maps the 6 numeric scoring columns to short aliases and calculates a composite score per row by averaging all available scores. Rows with no valid scores are dropped. Nulls are ignored rather than treated as zero.

### 4. Group by Trainer

Builds a lookup object keyed by trainer email. Each key maps to an array of that trainer's session rows, so all subsequent steps can work per-trainer without scanning the full dataset repeatedly.

### 5. Eligibility Filter

Excludes trainers who don't meet both of the following:

- **Minimum 5 sessions** — so each half of the early/late split has at least 2–3 sessions to average
- **Minimum 7 day span** — so improvement reflects genuine progression, not noise from a single burst of sessions within a day or two

### 6. Improvement Score

Sorts each trainer's sessions chronologically and splits them into a first half and second half. Improvement score = late half average minus early half average. Positive means they got better over time.

### 7. Quote Selection

Picks 2 quotes per trainer from their highest-scoring sessions. Tries the `3.12` field (what the learner liked most) first, falls back to `1.5` (context for scores) if empty. Each quote is linked to its `row_id` for traceability back to the original data.

---

## Output

`output.json` contains the Top 2 trainers sorted by improvement score, each with:

- `trainer_name`
- `n_sessions`
- `early_avg` and `late_avg`
- `improvement_score`
- `quotes` (2 quotes, each with `row_id` and `quote` text)
- `case_study_angle` (one-line pitch for why be/impact should reach out)

## Future Scalability

Current version is a script you have to run first by saving your csv as case-study-data.csv then running npm start.
For future robustness and to integrate properly into tooling I reccomend the flow below.

Bubble → n8n webhook → calls Express server endpoint (hosted on render) → returns Top 2 JSON → n8n → Bubble

## Reflections
