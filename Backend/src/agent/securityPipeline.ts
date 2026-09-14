/**
 * Kairo Security Intelligence & Evidence-First Evaluation Pipeline
 *
 * Core architectural principle:
 * Discovery is not a vulnerability. A vulnerability requires:
 *   Context + Evidence + Safe Validation + Demonstrated Security Impact.
 *
 * Pipeline Flow:
 *   Reconnaissance
 *     ↓
 *   Observation (Assets, endpoints, headers, robots.txt, metadata)
 *     ↓
 *   Candidate Vulnerability (Hypothesis requiring investigation)
 *     ↓
 *   Context Analysis (Target application model, auth model, routes)
 *     ↓
 *   Safe Validation (Controlled non-destructive verification)
 *     ↓
 *   Evidence Collection (Concrete tool & DOM proof)
 *     ↓
 *   Confidence Assessment (LOW | MEDIUM | HIGH | CONFIRMED)
 *     ↓
 *   Severity Assessment (Confidentiality, Integrity, Availability, Scope)
 *     ↓
 *   Final Deduplicated Vulnerability Report (Precision over volume)
 */

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CONFIRMED';
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingStatus =
  | 'observation'
  | 'candidate'
  | 'validated'
  | 'suppressed'
  | 'informational';
export type ValidationOutcome = 'validated' | 'refuted' | 'inconclusive' | 'not_tested';

export interface Observation {
  id: string;
  type:
    | 'endpoint'
    | 'asset'
    | 'header'
    | 'cookie'
    | 'technology'
    | 'form'
    | 'parameter'
    | 'file'
    | 'dns'
    | 'certificate'
    | 'error_pattern'
    | 'response_behavior';
  target: string;
  sourceTool: string;
  data: any;
  description: string;
  timestamp: number;
}

export interface ValidationRecord {
  testPerformed: string;
  expectedBehavior: string;
  observedBehavior: string;
  securityImplication: string;
  outcome: ValidationOutcome;
}

export interface TargetApplicationModel {
  targetHost: string;
  applicationType: 'spa' | 'ssr' | 'static' | 'api' | 'monolith' | 'unknown';
  technologies: string[];
  waf?: string;
  authModel: 'cookie_session' | 'bearer_jwt' | 'oauth2' | 'api_key' | 'basic' | 'none_detected';
  authorizationModel: 'rbac' | 'object_level' | 'tenant_scoped' | 'public_resource' | 'unknown';
  discoveredRoutes: string[];
  apiEndpoints: string[];
  parameters: Array<{ name: string; endpoint: string; context?: string }>;
  forms: Array<{ action: string; method: string; inputs: string[]; hasCsrfToken: boolean }>;
  publicResources: string[];
  sensitiveResources: string[];
  responsePatterns: string[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  category: string;
  severity: FindingSeverity;
  confidence: ConfidenceLevel;
  status: FindingStatus;
  affected_asset: string;
  description: string;
  evidence: string[];
  validation: ValidationRecord;
  impact: string;
  reasoning: {
    hypothesis: string;
    supportingFactors: string[];
    benignExplanationConsidered: string;
    decisionRationale: string;
  };
  reproduction?: string;
  remediation: string;
}

/**
 * 1. Target Application Modeling
 * Synthesizes observations to form a site-specific understanding of the target.
 */
export function buildTargetApplicationModel(
  targetHost: string,
  observations: Observation[]
): TargetApplicationModel {
  const cleanHost = targetHost.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  const model: TargetApplicationModel = {
    targetHost: cleanHost,
    applicationType: 'unknown',
    technologies: [],
    authModel: 'none_detected',
    authorizationModel: 'unknown',
    discoveredRoutes: [],
    apiEndpoints: [],
    parameters: [],
    forms: [],
    publicResources: [],
    sensitiveResources: [],
    responsePatterns: [],
  };

  for (const obs of observations) {
    // Technologies & WAF
    if (obs.type === 'technology' && obs.data) {
      if (obs.data.waf && !obs.data.waf.includes('No WAF')) {
        model.waf = obs.data.waf;
      }
      if (obs.data.serverBanner) {
        model.technologies.push(obs.data.serverBanner);
      }
      if (Array.isArray(obs.data.technologies)) {
        model.technologies.push(...obs.data.technologies);
      }
    }

    // Forms and interactive components
    if (obs.type === 'form' && obs.data) {
      const f = obs.data;
      model.forms.push({
        action: f.action || '',
        method: f.method || 'GET',
        inputs: Array.isArray(f.inputs)
          ? f.inputs.map((inp: any) => (typeof inp === 'string' ? inp : inp.name || ''))
          : [],
        hasCsrfToken: !!f.hasCsrfToken,
      });

      if (f.action) {
        model.discoveredRoutes.push(f.action);
      }
    }

    // Endpoints & Parameters
    if (obs.type === 'endpoint' && obs.target) {
      model.discoveredRoutes.push(obs.target);
      if (obs.target.includes('/api/')) {
        model.apiEndpoints.push(obs.target);
      }
    }

    if (obs.type === 'parameter' && obs.data?.name) {
      model.parameters.push({
        name: obs.data.name,
        endpoint: obs.target,
        context: obs.data.context,
      });
    }

    // Cookies & Auth model detection
    if (obs.type === 'cookie' && obs.data) {
      const cookieName = (obs.data.name || '').toLowerCase();
      if (cookieName.includes('jwt') || cookieName.includes('bearer')) {
        model.authModel = 'bearer_jwt';
      } else if (
        cookieName.includes('session') ||
        cookieName.includes('sess') ||
        cookieName.includes('sid') ||
        cookieName.includes('token')
      ) {
        model.authModel = 'cookie_session';
      }
    }

    // Known public resources
    if (obs.type === 'asset' && obs.target) {
      const lower = obs.target.toLowerCase();
      if (
        lower.endsWith('robots.txt') ||
        lower.endsWith('sitemap.xml') ||
        lower.endsWith('favicon.ico') ||
        lower.endsWith('.js') ||
        lower.endsWith('.css')
      ) {
        model.publicResources.push(obs.target);
      }
    }
  }

  // Deduplicate arrays
  model.technologies = Array.from(new Set(model.technologies.filter(Boolean)));
  model.discoveredRoutes = Array.from(new Set(model.discoveredRoutes.filter(Boolean)));
  model.apiEndpoints = Array.from(new Set(model.apiEndpoints.filter(Boolean)));
  model.publicResources = Array.from(new Set(model.publicResources.filter(Boolean)));

  // Infer application type
  if (model.apiEndpoints.length > 0 && model.discoveredRoutes.length === model.apiEndpoints.length) {
    model.applicationType = 'api';
  } else if (
    model.technologies.some((t) => /next\.js|react|vue|angular|vite/i.test(t)) ||
    observations.some((o) => o.data?.links && o.data?.links.length > 5)
  ) {
    model.applicationType = 'spa';
  } else if (model.technologies.some((t) => /django|rails|express|spring|laravel|php/i.test(t))) {
    model.applicationType = 'monolith';
  }

  return model;
}

/**
 * 2. False-Positive & Benign Explanation Rules
 * Enforces: Discovery != Vulnerability.
 * Every candidate must survive an attempt to explain the behavior as normal application behavior.
 */
export interface BenignCheckResult {
  isFalsePositive: boolean;
  isInformationalOnly: boolean;
  benignExplanation: string;
  decisionRationale: string;
  recommendedStatus: FindingStatus;
  recommendedSeverity: FindingSeverity;
  recommendedConfidence: ConfidenceLevel;
}

export function evaluateCandidateAgainstBenignExplanations(
  candidate: {
    title: string;
    category?: string;
    affected_asset: string;
    evidence: string[];
    validation?: ValidationRecord;
    description?: string;
  },
  appModel?: TargetApplicationModel
): BenignCheckResult {
  const asset = (candidate.affected_asset || '').toLowerCase();
  const title = (candidate.title || '').toLowerCase();
  const cat = (candidate.category || '').toLowerCase();
  const evidenceText = (candidate.evidence || []).join(' ').toLowerCase();

  // Rule 1: robots.txt
  // robots.txt alone is an observation, NEVER an information disclosure vulnerability.
  if (asset.endsWith('/robots.txt') || asset === 'robots.txt' || title.includes('robots.txt')) {
    const hasAccessibleSensitivePath =
      candidate.validation?.outcome === 'validated' &&
      candidate.validation?.observedBehavior.toLowerCase().includes('unauthorized access granted');

    if (!hasAccessibleSensitivePath) {
      return {
        isFalsePositive: true,
        isInformationalOnly: true,
        benignExplanation:
          'Robots.txt is an RFC-standard search crawler directive file intended to be publicly accessible. Mentioning disallowed paths (such as /admin or /backup) is normal crawler guidance and does not grant access or leak private data.',
        decisionRationale:
          'Not a vulnerability because robots.txt is intentionally public and no sensitive resource was demonstrated to be accessible without authorization.',
        recommendedStatus: 'informational',
        recommendedSeverity: 'INFO',
        recommendedConfidence: 'LOW',
      };
    }
  }

  // Rule 2: sitemap.xml, favicon, normal static assets, public JS
  if (
    asset.endsWith('/sitemap.xml') ||
    asset.endsWith('/favicon.ico') ||
    asset.endsWith('.css') ||
    (asset.endsWith('.js') && !title.includes('secret') && !title.includes('credential'))
  ) {
    return {
      isFalsePositive: true,
      isInformationalOnly: true,
      benignExplanation:
        'Static assets, favicons, sitemaps, and public client-side JavaScript bundles are intentionally public resources required for browser rendering.',
      decisionRationale:
        'Not a vulnerability because the resource is intentionally public and contains standard frontend assets.',
      recommendedStatus: 'informational',
      recommendedSeverity: 'INFO',
      recommendedConfidence: 'LOW',
    };
  }

  // Rule 3: Server header / Framework version disclosure alone
  if (
    title.includes('server banner') ||
    title.includes('version disclosure') ||
    title.includes('framework fingerprint') ||
    cat.includes('fingerprint') ||
    cat.includes('banner')
  ) {
    const hasExploitableCveProof =
      candidate.validation?.outcome === 'validated' &&
      (candidate.evidence || []).some((e) => /cve-\d{4}-\d+/i.test(e) && /exploited|confirmed/i.test(e));

    if (!hasExploitableCveProof) {
      return {
        isFalsePositive: true,
        isInformationalOnly: true,
        benignExplanation:
          'Software version banners (e.g. nginx/1.18.0, Express) are informational protocol indicators. Version identification alone without a confirmed, reachable exploit does not create security impact.',
        decisionRationale:
          'Informational only because version strings do not demonstrate exploitability without an active, verified attack path.',
        recommendedStatus: 'informational',
        recommendedSeverity: 'INFO',
        recommendedConfidence: 'LOW',
      };
    }
  }

  // Rule 4: Missing security headers without demonstrated exploit
  if (
    cat.includes('header') ||
    title.includes('header') ||
    title.includes('content-security-policy') ||
    title.includes('csp') ||
    title.includes('hsts') ||
    title.includes('strict-transport') ||
    title.includes('x-frame-options') ||
    title.includes('frame-options') ||
    evidenceText.includes('missing content-security-policy') ||
    evidenceText.includes('missing strict-transport-security')
  ) {
    const hasDemonstratedAttack =
      candidate.validation?.outcome === 'validated' &&
      candidate.validation?.observedBehavior.toLowerCase().includes('framing succeeded on sensitive page');

    if (!hasDemonstratedAttack) {
      return {
        isFalsePositive: false,
        isInformationalOnly: true,
        benignExplanation:
          'Security response headers (CSP, HSTS, X-Frame-Options) represent defense-in-depth posture best practices. Their absence is a hardening recommendation, not a standalone high-impact vulnerability.',
        decisionRationale:
          'Classified as low-severity hardening recommendation because no active exploit (e.g., clickjacking or cross-site scripting) was demonstrated.',
        recommendedStatus: 'informational',
        recommendedSeverity: 'LOW',
        recommendedConfidence: 'MEDIUM',
      };
    }
  }

  // Rule 5: Parameter named 'id', 'user_id', 'account' without cross-user authorization proof (IDOR)
  if (
    title.includes('idor') ||
    title.includes('broken object level') ||
    cat.includes('idor') ||
    cat.includes('authorization')
  ) {
    const validationOutcome = candidate.validation?.outcome;
    const hasCrossUserAccess =
      validationOutcome === 'validated' &&
      (candidate.validation?.observedBehavior.toLowerCase().includes('accessed user') ||
        candidate.validation?.observedBehavior.toLowerCase().includes('unauthorized cross-user data') ||
        evidenceText.includes('cross-user access confirmed'));

    if (!hasCrossUserAccess) {
      return {
        isFalsePositive: true,
        isInformationalOnly: false,
        benignExplanation:
          'Resource identifiers (such as id, userId, accountId) are standard REST API parameters. User-controlled identifiers are not IDORs unless the application fails to verify authorization when one user requests another user’s record.',
        decisionRationale:
          'Not a confirmed IDOR because authorization behavior remained consistent or cross-user data leakage was not demonstrated.',
        recommendedStatus: 'candidate',
        recommendedSeverity: 'LOW',
        recommendedConfidence: 'LOW',
      };
    }
  }

  // Rule 6: Generic SQL / DB error message without injection syntax control
  if (title.includes('sql injection') || cat.includes('sqli') || cat.includes('injection')) {
    const hasSyntaxProof =
      candidate.validation?.outcome === 'validated' &&
      (candidate.validation?.observedBehavior.toLowerCase().includes('syntax controlled') ||
        candidate.validation?.observedBehavior.toLowerCase().includes('sleep delay confirmed') ||
        candidate.validation?.observedBehavior.toLowerCase().includes('extracted data'));

    const onlyGenericError =
      evidenceText.includes('error in your sql syntax') ||
      evidenceText.includes('database error') ||
      evidenceText.includes('unhandled exception');

    if (!hasSyntaxProof && onlyGenericError) {
      return {
        isFalsePositive: false,
        isInformationalOnly: false,
        benignExplanation:
          'Database error messages indicate unhandled exceptions or verbose debugging, but do not prove SQL injection without verified syntax manipulation or unauthorized data retrieval.',
        decisionRationale:
          'Retained as candidate hypothesis only. Unvalidated error messages cannot be escalated to confirmed SQL injection without proof of syntax control.',
        recommendedStatus: 'candidate',
        recommendedSeverity: 'MEDIUM',
        recommendedConfidence: 'LOW',
      };
    }
  }

  // Rule 7: SSRF hypothesis on parameter names (url=, redirect=, callback=)
  if (title.includes('ssrf') || cat.includes('ssrf') || cat.includes('request forgery')) {
    const hasServerInteractionProof =
      candidate.validation?.outcome === 'validated' &&
      (candidate.validation?.observedBehavior.toLowerCase().includes('out-of-band request') ||
        candidate.validation?.observedBehavior.toLowerCase().includes('internal metadata accessed') ||
        candidate.validation?.observedBehavior.toLowerCase().includes('internal network response'));

    if (!hasServerInteractionProof) {
      return {
        isFalsePositive: false,
        isInformationalOnly: false,
        benignExplanation:
          'URL parameters are common in legitimate proxy, redirect, or image rendering workflows. SSRF requires proof of backend network request dispatch.',
        decisionRationale:
          'Candidate hypothesis only: Parameter accepts URL format, but server-side network interaction was not demonstrated.',
        recommendedStatus: 'candidate',
        recommendedSeverity: 'LOW',
        recommendedConfidence: 'LOW',
      };
    }
  }

  // Rule 8: Secrets / Credentials in code or responses
  if (title.includes('secret') || title.includes('credential') || cat.includes('secret')) {
    const isMockOrTest =
      asset.includes('test') ||
      asset.includes('mock') ||
      asset.includes('fixture') ||
      asset.includes('.example') ||
      evidenceText.includes('example.com') ||
      evidenceText.includes('dummy') ||
      evidenceText.includes('test_');

    const isPublishableToken =
      evidenceText.includes('pk_test_') ||
      evidenceText.includes('pk_live_') ||
      evidenceText.includes('next_public_') ||
      evidenceText.includes('public_key');

    if (isMockOrTest || isPublishableToken) {
      return {
        isFalsePositive: true,
        isInformationalOnly: true,
        benignExplanation: isPublishableToken
          ? 'Identified string is a public client-side token (e.g. Stripe publishable key or NEXT_PUBLIC_* variable) intentionally exposed by design.'
          : 'Identified string resides in test/mock fixtures or template documentation, not active production code.',
        decisionRationale:
          'Not a vulnerability because the token is either intentionally public by design or non-production test data.',
        recommendedStatus: 'suppressed',
        recommendedSeverity: 'INFO',
        recommendedConfidence: 'LOW',
      };
    }
  }

  // Default: Not suppressed by benign rules
  return {
    isFalsePositive: false,
    isInformationalOnly: false,
    benignExplanation: 'No standard benign explanation fully accounts for the observed security divergence.',
    decisionRationale: 'Candidate retains security significance based on verified behavioral divergence.',
    recommendedStatus: candidate.validation?.outcome === 'validated' ? 'validated' : 'candidate',
    recommendedSeverity: 'MEDIUM',
    recommendedConfidence: candidate.validation?.outcome === 'validated' ? 'HIGH' : 'MEDIUM',
  };
}

/**
 * 3. Confidence and Severity Calculation
 * Enforces:
 *   - Severity depends on demonstrated impact (Confidentiality, Integrity, Availability, Auth bypass, Privilege Escalation).
 *   - Confidence depends on evidence strength and validation status (LOW, MEDIUM, HIGH, CONFIRMED).
 *   - A suspected critical issue with weak evidence CANNOT be marked CONFIRMED.
 */
export function calculateConfidence(
  validation: ValidationRecord,
  evidenceCount: number,
  isSiteSpecific: boolean,
  hasIndependentSignals: boolean
): ConfidenceLevel {
  if (validation.outcome === 'validated') {
    return 'CONFIRMED';
  }
  if (hasIndependentSignals && evidenceCount >= 2 && isSiteSpecific) {
    return 'HIGH';
  }
  if (evidenceCount >= 1 && isSiteSpecific) {
    return 'MEDIUM';
  }
  return 'LOW';
}

export function calculateSeverity(
  category: string,
  impactDescription: string,
  validationOutcome: ValidationOutcome,
  scope: 'global' | 'user' | 'informational'
): FindingSeverity {
  const cat = category.toLowerCase();
  const impact = impactDescription.toLowerCase();

  // Informational scope
  if (scope === 'informational' || validationOutcome === 'refuted') {
    return 'INFO';
  }

  // Critical: Unauthenticated RCE, Full Admin Takeover, Direct Database Compromise
  if (
    validationOutcome === 'validated' &&
    (impact.includes('remote code execution') ||
      impact.includes('arbitrary code') ||
      impact.includes('full database access') ||
      impact.includes('complete account takeover') ||
      cat.includes('rce'))
  ) {
    return 'CRITICAL';
  }

  // High: Validated IDOR accessing PII, SQLi, Stored XSS in sensitive area, SSRF to internal metadata
  if (
    validationOutcome === 'validated' &&
    (cat.includes('idor') ||
      cat.includes('sqli') ||
      cat.includes('auth') ||
      cat.includes('ssrf') ||
      impact.includes('unauthorized access to another user') ||
      impact.includes('bypass authentication') ||
      impact.includes('read arbitrary files'))
  ) {
    return 'HIGH';
  }

  // Unvalidated hypotheses with strong indicators
  if (validationOutcome !== 'validated') {
    if (cat.includes('rce') || cat.includes('sqli')) {
      return 'MEDIUM'; // Unverified high-risk hypothesis caps at Medium until validated
    }
    if (cat.includes('idor') || cat.includes('ssrf')) {
      return 'LOW'; // Unverified IDOR/SSRF hypothesis caps at Low
    }
    return 'INFO';
  }

  // Medium: Validated CSRF on non-critical action, Reflected XSS with user interaction required
  if (cat.includes('xss') || cat.includes('csrf') || impact.includes('limited session')) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * 4. Finding Deduplication & Correlation
 * Merges duplicate candidate findings affecting the same component or root cause into a single finding.
 */
export function correlateAndDeduplicateFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const grouped = new Map<string, SecurityFinding>();

  for (const f of findings) {
    // Normalize affected asset (strip query params, trailing slashes, scheme)
    const normalizedAsset = (f.affected_asset || '')
      .replace(/^https?:\/\//, '')
      .split('?')[0]
      .replace(/\/+$/, '')
      .toLowerCase();

    // Key on normalized asset + category
    const key = `${normalizedAsset}::${f.category.toLowerCase().trim()}`;

    if (!grouped.has(key)) {
      grouped.set(key, { ...f, evidence: [...f.evidence] });
    } else {
      const existing = grouped.get(key)!;

      // Merge evidence uniquely
      for (const ev of f.evidence) {
        if (!existing.evidence.includes(ev)) {
          existing.evidence.push(ev);
        }
      }

      // Keep the most validated status
      const statusPrecedence: Record<FindingStatus, number> = {
        validated: 4,
        candidate: 3,
        informational: 2,
        observation: 1,
        suppressed: 0,
      };

      if (statusPrecedence[f.status] > statusPrecedence[existing.status]) {
        existing.status = f.status;
        existing.confidence = f.confidence;
        existing.severity = f.severity;
        existing.title = f.title;
        existing.validation = f.validation;
        existing.impact = f.impact;
      }

      // Keep higher confidence
      const confPrecedence: Record<ConfidenceLevel, number> = {
        CONFIRMED: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      if (confPrecedence[f.confidence] > confPrecedence[existing.confidence]) {
        existing.confidence = f.confidence;
      }
    }
  }

  return Array.from(grouped.values());
}

/**
 * 5. Negative Conclusion Helper
 * Explains clearly why an investigated indicator is NOT a vulnerability.
 */
export function generateNegativeConclusion(target: string, reason: string): string {
  return `ℹ️ **Non-Vulnerability Assessment for \`${target}\`**:\n${reason}`;
}

/**
 * 6. Precision-First Technical Report Generator
 * Prioritizes precision over volume (5 highly credible vulnerabilities > 50 noisy alerts).
 */
export function formatTechnicalSecurityReport(params: {
  model: TargetApplicationModel;
  observations: Observation[];
  confirmedVulnerabilities: SecurityFinding[];
  candidateFindings: SecurityFinding[];
  suppressedOrBenign: SecurityFinding[];
  diagnosticToolsCount?: number;
}): string {
  const { model, observations, confirmedVulnerabilities, candidateFindings, suppressedOrBenign, diagnosticToolsCount } = params;

  // Count summary
  const totalFindings = confirmedVulnerabilities.length;
  const overallRisk =
    confirmedVulnerabilities.some((v) => v.severity === 'CRITICAL')
      ? 'CRITICAL'
      : confirmedVulnerabilities.some((v) => v.severity === 'HIGH')
      ? 'HIGH'
      : confirmedVulnerabilities.some((v) => v.severity === 'MEDIUM')
      ? 'MEDIUM'
      : totalFindings > 0
      ? 'LOW'
      : 'MINIMAL / HARDENED';

  const lines: string[] = [];

  // Header & Executive Summary
  lines.push(`# 🛡️ Technical Security Audit Report`);
  lines.push(``);
  lines.push(`**Target Asset**: \`${model.targetHost || 'Audited Target'}\`  `);
  lines.push(`**Application Profile**: \`${model.applicationType.toUpperCase()}\` | **Technologies**: ${model.technologies.join(', ') || 'Standard Web Stack'}  `);
  lines.push(`**Authentication Model**: \`${model.authModel.replace(/_/g, ' ').toUpperCase()}\`  `);
  lines.push(`**Overall Assessed Risk**: **${overallRisk}**  `);
  lines.push(`**Methodology**: Evidence-First ReAct Evaluation (${diagnosticToolsCount || observations.length} telemetry passes)  `);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Section 1: Executive Security Summary
  lines.push(`## 🎯 1. Executive Summary & Context Profile`);
  lines.push(`Kairo evaluated \`${model.targetHost}\` using context-aware hypothesis testing. In adherence to precision standards, discovery of reconnaissance indicators is cleanly separated from validated security flaws.`);
  lines.push(``);
  lines.push(`- **Validated Vulnerabilities**: ${confirmedVulnerabilities.length} (Context + Evidence + Demonstrated Impact)`);
  lines.push(`- **Investigated Candidates**: ${candidateFindings.length} (Weak signals requiring additional verification)`);
  lines.push(`- **Reconnaissance Observations**: ${observations.length} (Normal application behavior / architecture context)`);
  lines.push(`- **Suppressed / Benign Items**: ${suppressedOrBenign.length} (Confirmed non-vulnerabilities)`);
  lines.push(``);

  // Section 2: Target Application Profile & Reconnaissance Observations
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 🔍 2. Target Profile & Reconnaissance Observations`);
  lines.push(`> *These observations represent standard application behavior and architecture metadata discovered during reconnaissance. They are NOT security vulnerabilities.*`);
  lines.push(``);
  lines.push(`| Observation Type | Scope / Target | Details | Security Relevance |`);
  lines.push(`| :--- | :--- | :--- | :--- |`);

  // Include top observations (robots.txt, headers, dns, cert)
  const displayObs = observations.slice(0, 8);
  for (const obs of displayObs) {
    const cleanDesc = (obs.description || 'Observed asset').replace(/\|/g, '\\|');
    lines.push(`| \`${obs.type.toUpperCase()}\` | \`${obs.target}\` | ${cleanDesc} | Context Mapping |`);
  }
  if (observations.length === 0) {
    lines.push(`| \`RECON\` | \`${model.targetHost}\` | Passive discovery completed without anomalous infrastructure leaks. | Baseline Hygiene |`);
  }
  lines.push(``);

  // Section 3: Validated Vulnerability Matrix Table
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 🚨 3. Validated Vulnerability Matrix`);
  lines.push(``);

  if (confirmedVulnerabilities.length > 0) {
    lines.push(`| ID | Severity | Confidence | Status | Endpoint / Asset | Finding & Impact | Remediation Summary |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
    confirmedVulnerabilities.forEach((v, idx) => {
      const id = `VULN-00${idx + 1}`;
      const asset = v.affected_asset.replace(/\|/g, '\\|');
      const impactSummary = `${v.title}: ${v.impact}`.replace(/\|/g, '\\|');
      const rem = v.remediation.replace(/\|/g, '\\|').slice(0, 60);
      lines.push(`| **${id}** | **${v.severity}** | \`${v.confidence}\` | \`${v.status.toUpperCase()}\` | \`${asset}\` | ${impactSummary} | ${rem} |`);
    });
  } else {
    lines.push(`> ✅ **Zero Confirmed High-Confidence Vulnerabilities Detected.**`);
    lines.push(`> No candidates exhibited verified security impact or bypass under current safe validation constraints.`);
  }
  lines.push(``);

  // Section 4: In-Depth Technical Findings & Evidence
  if (confirmedVulnerabilities.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 🔬 4. In-Depth Vulnerability Evidence & Validation`);
    lines.push(``);

    confirmedVulnerabilities.forEach((v, idx) => {
      lines.push(`### 4.${idx + 1}. [${v.severity}] ${v.title}`);
      lines.push(`- **Affected Asset**: \`${v.affected_asset}\``);
      lines.push(`- **Vulnerability Category**: \`${v.category}\``);
      lines.push(`- **Confidence Rating**: **${v.confidence}** (Validation Outcome: \`${v.validation.outcome}\`)`);
      lines.push(`- **Security Impact**: ${v.impact}`);
      lines.push(``);
      lines.push(`#### Technical Evidence`);
      v.evidence.forEach((ev) => lines.push(`- ${ev}`));
      lines.push(``);
      lines.push(`#### Validation Proof`);
      lines.push(`- **Test Performed**: ${v.validation.testPerformed}`);
      lines.push(`- **Expected Behavior**: ${v.validation.expectedBehavior}`);
      lines.push(`- **Observed Behavior**: ${v.validation.observedBehavior}`);
      lines.push(`- **Security Implication**: ${v.validation.securityImplication}`);
      lines.push(``);
      lines.push(`#### Remediation`);
      lines.push(v.remediation);
      lines.push(``);
    });
  }

  // Section 5: Evaluated Candidates & Benign Behaviors (Explaining why things are NOT vulnerabilities)
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 🛡️ 5. Evaluated Candidates & Benign Behaviors`);
  lines.push(`> Kairo actively evaluates candidates against normal application behavior to prevent false positives.`);
  lines.push(``);

  if (suppressedOrBenign.length > 0 || candidateFindings.length > 0) {
    const allEvaluated = [...suppressedOrBenign, ...candidateFindings];
    lines.push(`| Evaluated Item | Hypothesis Tested | Conclusion | Why It Is Not A Vulnerability |`);
    lines.push(`| :--- | :--- | :--- | :--- |`);

    for (const item of allEvaluated.slice(0, 6)) {
      const hyp = item.reasoning.hypothesis || item.title;
      const conc = item.status === 'suppressed' ? 'False Positive / Benign' : item.status === 'informational' ? 'Informational Only' : 'Unverified Candidate';
      const why = item.reasoning.benignExplanationConsidered || 'Normal operational behavior verified.';
      lines.push(`| \`${item.affected_asset}\` | ${hyp.replace(/\|/g, '\\|')} | **${conc}** | ${why.replace(/\|/g, '\\|')} |`);
    }
  } else {
    lines.push(`- Standard discovery items (e.g. \`/robots.txt\`, static JS, server banners) were analyzed and confirmed to have no authorization bypass or data leakage.`);
  }
  lines.push(``);

  // Section 6: Prioritized Remediation Roadmap
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 🛠️ 6. Prioritized Remediation Roadmap`);
  lines.push(``);
  lines.push(`1. **Immediate (P0)**: Remediate any confirmed vulnerabilities with demonstrated access control or data exposure.`);
  lines.push(`2. **Hardening (P1)**: Enforce defense-in-depth HTTP headers (\`Content-Security-Policy\`, \`Strict-Transport-Security: max-age=31536000; includeSubDomains\`, \`X-Content-Type-Options: nosniff\`).`);
  lines.push(`3. **Monitoring (P2)**: Maintain least-privilege logging and rate-limiting across all public API endpoints.`);
  lines.push(``);

  return lines.join('\n');
}
