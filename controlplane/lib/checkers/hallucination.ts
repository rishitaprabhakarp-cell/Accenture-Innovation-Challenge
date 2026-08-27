import { CheckerResult } from "../types";

// Extract key factual claims from text: numbers, dates, percentages, specific nouns
function extractClaims(text: string): string[] {
  const claims: string[] = [];

  // Numeric facts: "$X", "X days", "X%", "X months", dates
  const numericPatterns = [
    /\$[\d,]+(?:\.\d+)?/g,
    /\d+(?:\.\d+)?%/g,
    /\d+\s*(?:day|week|month|year|hour)s?\b/gi,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{4}\b/g, // years
    /\b(?:FICO|DTI|LTV)\s+\d+/gi,
  ];

  for (const pattern of numericPatterns) {
    const matches = text.match(pattern);
    if (matches) claims.push(...matches);
  }

  // Policy/claim keywords
  const claimPhrases = text.match(
    /\b(?:requires?|must|mandatory|prohibited|allowed|automatic|guaranteed|offer|provide|accept|decline|reject|approve)\s+\w+(?:\s+\w+){0,4}/gi
  );
  if (claimPhrases) claims.push(...claimPhrases.slice(0, 10));

  return [...new Set(claims)];
}

// Check if a claim can be grounded in any of the source docs
function isGrounded(claim: string, sourceDocs: string[]): boolean {
  const normalizedClaim = claim.toLowerCase().replace(/[$,%]/g, "").trim();
  return sourceDocs.some((doc) =>
    doc.toLowerCase().includes(normalizedClaim) ||
    // Check if the key numbers appear somewhere in the docs
    (normalizedClaim.match(/\d+/) || []).every((num) =>
      doc.toLowerCase().includes(num)
    )
  );
}

// Detect temporal hallucinations: response cites old guidelines when source has newer
function detectTemporalMismatch(response: string, sourceDocs: string[]): string[] {
  const issues: string[] = [];
  const yearPattern = /\b(20\d{2})\b/g;

  const responseYears = [...response.matchAll(yearPattern)].map((m) => parseInt(m[1]));
  const sourceYears = sourceDocs
    .join(" ")
    .matchAll(yearPattern);
  const sourceYearNums = [...sourceYears].map((m) => parseInt(m[1]));

  if (responseYears.length > 0 && sourceYearNums.length > 0) {
    const maxSourceYear = Math.max(...sourceYearNums);
    const minResponseYear = Math.min(...responseYears);
    if (minResponseYear < maxSourceYear - 1) {
      issues.push(
        `Response cites ${minResponseYear} guidance; source docs reference ${maxSourceYear} — possible outdated reference`
      );
    }
  }

  return issues;
}

// Check for contradiction signals: response says opposite of source
function detectContradictions(response: string, sourceDocs: string[]): string[] {
  const issues: string[] = [];
  const contradictPairs = [
    { responseKeyword: /optional/i, sourceKeyword: /required|mandatory/i, label: "Optional vs Required claim" },
    { responseKeyword: /automatic(?:ally)?\s+declin/i, sourceKeyword: /case.by.case|no automatic/i, label: "Automatic decline vs case-by-case policy" },
    { responseKeyword: /prohibited/i, sourceKeyword: /allowed|permitted/i, label: "Prohibition vs Permission" },
    { responseKeyword: /no\s+(?:additional|extra)\s+discount/i, sourceKeyword: /\d+%\s+(?:off|discount)/i, label: "Discount contradiction" },
    { responseKeyword: /draft/i, sourceKeyword: /effective/i, label: "Draft status vs effective policy" },
  ];

  for (const { responseKeyword, sourceKeyword, label } of contradictPairs) {
    if (responseKeyword.test(response) && sourceDocs.some((d) => sourceKeyword.test(d))) {
      issues.push(`Potential contradiction: ${label}`);
    }
    if (sourceKeyword.test(response) && sourceDocs.some((d) => responseKeyword.test(d))) {
      issues.push(`Potential contradiction (inverse): ${label}`);
    }
  }

  return issues;
}

export async function runHallucinationChecker(
  response: string,
  sourceDocs: string[]
): Promise<CheckerResult> {
  const start = Date.now();
  const details: string[] = [];

  if (!sourceDocs || sourceDocs.length === 0) {
    return {
      checker: "hallucination",
      score: 0.40, // no source docs to verify against — moderate uncertainty
      triggered: true,
      details: ["No source documents provided — grounding cannot be verified"],
      latencyMs: Date.now() - start,
    };
  }

  const claims = extractClaims(response);
  let ungroundedCount = 0;
  const ungroundedClaims: string[] = [];

  for (const claim of claims) {
    if (!isGrounded(claim, sourceDocs)) {
      ungroundedClaims.push(claim);
      ungroundedCount++;
    }
  }

  // Temporal and contradiction checks
  const temporalIssues = detectTemporalMismatch(response, sourceDocs);
  const contradictions = detectContradictions(response, sourceDocs);

  details.push(...temporalIssues, ...contradictions);

  if (ungroundedClaims.length > 0) {
    details.push(
      `${ungroundedCount}/${claims.length} factual claims unverified against source documents`
    );
    if (ungroundedClaims.length <= 4) {
      details.push(`Unverified claims: ${ungroundedClaims.slice(0, 4).join(", ")}`);
    }
  } else if (claims.length > 0) {
    details.push(`All ${claims.length} extracted claims grounded in source documents`);
  } else {
    details.push("No specific factual claims detected to verify");
  }

  // Score calculation
  const claimRatio = claims.length > 0 ? ungroundedCount / claims.length : 0;
  const contradictionPenalty = contradictions.length * 0.20;
  const temporalPenalty = temporalIssues.length * 0.25;
  const score = Math.min(
    claimRatio * 0.6 + contradictionPenalty + temporalPenalty,
    1.0
  );

  return {
    checker: "hallucination",
    score,
    triggered: score > 0.20,
    details,
    latencyMs: Date.now() - start,
  };
}
