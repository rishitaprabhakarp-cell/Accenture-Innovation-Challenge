import { CheckerResult } from "../types";

// PII pattern registry — each entry has a label, regex, and severity weight
const PII_PATTERNS: Array<{ label: string; pattern: RegExp; severity: number }> = [
  { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/, severity: 1.0 },
  { label: "Credit Card Number", pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/, severity: 1.0 },
  { label: "Email Address", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, severity: 0.65 },
  { label: "Phone Number", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, severity: 0.55 },
  { label: "Date of Birth", pattern: /\b(?:DOB|date of birth|born on|birth date)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i, severity: 0.80 },
  { label: "Employee ID", pattern: /\bE-\d{4,6}\b|\b(?:employee|emp)\s*(?:ID|#|no)[:\s]+[A-Z]?\d{4,8}\b/i, severity: 0.60 },
  { label: "IP Address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/, severity: 0.30 },
  { label: "Passport Number", pattern: /\b[A-Z]{1,2}\d{6,9}\b/, severity: 0.85 },
  { label: "Bank Account", pattern: /\baccount\s+(?:number|no|#)[:\s]+\d{8,17}\b/i, severity: 0.90 },
  { label: "Full Name (Explicit)", pattern: /\b(?:named?|person|applicant|customer)[:\s]+[A-Z][a-z]+\s+[A-Z][a-z]+\b/, severity: 0.40 },
  { label: "Salary / Compensation", pattern: /\b(?:salary|compensation|bonus|pay)[:\s]+\$[\d,]+\b/i, severity: 0.55 },
];

// Named entity heuristics: patterns that strongly suggest personal names in sensitive context
const NAME_CONTEXT_PATTERNS: RegExp[] = [
  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+\((?:DOB|SSN|EMP|Employee)\b/,
  /\bplaced by\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/i,
  /\b(?:leads?|contact|applicant|claimant)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/,
];

export async function runPiiChecker(
  response: string,
  _sourceDocs: string[]
): Promise<CheckerResult> {
  const start = Date.now();
  const details: string[] = [];
  let maxSeverity = 0;
  let hitCount = 0;

  for (const { label, pattern, severity } of PII_PATTERNS) {
    if (pattern.test(response)) {
      details.push(`Detected: ${label}`);
      maxSeverity = Math.max(maxSeverity, severity);
      hitCount++;
    }
  }

  for (const pattern of NAME_CONTEXT_PATTERNS) {
    if (pattern.test(response)) {
      details.push("Detected: Personal name in sensitive context");
      maxSeverity = Math.max(maxSeverity, 0.50);
      hitCount++;
    }
  }

  // Score: blend of max severity and hit count breadth
  const breadthBonus = Math.min(hitCount * 0.08, 0.30);
  const score = hitCount > 0 ? Math.min(maxSeverity + breadthBonus, 1.0) : 0;

  return {
    checker: "pii",
    score,
    triggered: score > 0.15,
    details: details.length ? details : ["No PII patterns detected"],
    latencyMs: Date.now() - start,
  };
}
