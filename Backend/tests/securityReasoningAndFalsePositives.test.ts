import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildTargetApplicationModel,
  evaluateCandidateAgainstBenignExplanations,
  calculateConfidence,
  calculateSeverity,
  correlateAndDeduplicateFindings,
  formatTechnicalSecurityReport,
  generateNegativeConclusion,
  Observation,
  SecurityFinding,
  ValidationRecord,
} from '../src/agent/securityPipeline';
import { executeSecurityTool } from '../src/agent/tools';

describe('Kairo Security Intelligence & Precision Evaluation Suite', () => {
  // --------------------------------------------------------------------------
  // 1. Mandatory False-Positive: robots.txt
  // --------------------------------------------------------------------------
  describe('Rule 1: robots.txt False-Positive Handling', () => {
    it('robots.txt alone must be treated as an informational observation, NOT a vulnerability', () => {
      const candidate = {
        title: 'Exposed robots.txt File',
        category: 'Information Disclosure',
        affected_asset: 'https://example.com/robots.txt',
        evidence: [
          'Found /robots.txt with Disallow: /admin, Disallow: /internal, Disallow: /backup',
        ],
        validation: {
          testPerformed: 'HTTP GET /robots.txt',
          expectedBehavior: 'HTTP 200 with crawling directives',
          observedBehavior: 'Directives list /admin and /internal',
          securityImplication: 'Search engine crawler guidance published',
          outcome: 'inconclusive' as const,
        },
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.isInformationalOnly, true);
      assert.strictEqual(result.recommendedStatus, 'informational');
      assert.strictEqual(result.recommendedSeverity, 'INFO');
      assert.strictEqual(result.recommendedConfidence, 'LOW');
      assert.match(result.benignExplanation, /search crawler directive/i);
      assert.match(result.decisionRationale, /Not a vulnerability because robots\.txt is intentionally public/i);
    });

    it('robots.txt referencing a path that is proven to be unauthenticated and leak sensitive data CAN be validated', () => {
      const candidate = {
        title: 'Unauthenticated Sensitive Backup Exposure via Disallowed Path',
        category: 'Broken Access Control',
        affected_asset: 'https://example.com/backup/database_dump.sql',
        evidence: [
          'Path referenced in robots.txt (/backup)',
          'GET /backup/database_dump.sql returned 200 OK without authentication',
          'Payload contained live database credentials and user tables',
        ],
        validation: {
          testPerformed: 'Probed disallowed path /backup/database_dump.sql without authentication',
          expectedBehavior: 'HTTP 401/403 Access Denied',
          observedBehavior: 'Unauthorized access granted to database dump without authentication',
          securityImplication: 'Full database exposure without authentication controls',
          outcome: 'validated' as const,
        },
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, false);
      assert.strictEqual(result.isInformationalOnly, false);
      assert.strictEqual(result.recommendedStatus, 'validated');
    });

    it('nuclei native fallback tool does NOT label robots.txt as Information Disclosure', async () => {
      // Test the tool directly
      const nucleiResult = await executeSecurityTool('vuln_template_scan_nuclei', {
        targetUrl: 'https://example.com',
      });

      const matched = nucleiResult.toolCall.resultDetails?.matchedResults || [];
      const hasOldFalsePositive = matched.some((m) =>
        m.includes('Information Disclosure') && m.includes('robots.txt')
      );
      assert.strictEqual(hasOldFalsePositive, false, 'Should not claim robots.txt is Information Disclosure');

      const hasObservation = matched.some((m) =>
        m.includes('observation:robots-txt') || m.includes('No high-severity')
      );
      assert.strictEqual(hasObservation, true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. IDOR / Access Control Validation
  // --------------------------------------------------------------------------
  describe('Rule 2: IDOR and Parameter Verification', () => {
    it('parameter named "id" is NOT automatically an IDOR', () => {
      const candidate = {
        title: 'Potential IDOR on User Profile',
        category: 'IDOR',
        affected_asset: 'https://example.com/api/users?id=101',
        evidence: ['Parameter name is "id" and accepts numeric integer'],
        validation: {
          testPerformed: 'Observed user-controlled parameter "id"',
          expectedBehavior: 'API accepts user-controlled identifier',
          observedBehavior: 'Requests with user id 101 returned user 101 data',
          securityImplication: 'User input controls object identifier',
          outcome: 'inconclusive' as const,
        },
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.recommendedStatus, 'candidate');
      assert.strictEqual(result.recommendedConfidence, 'LOW');
      assert.match(result.benignExplanation, /Resource identifiers .* are standard REST API parameters/i);
      assert.match(result.decisionRationale, /Not a confirmed IDOR because authorization behavior remained consistent/i);
    });

    it('ID parameter with demonstrated cross-user unauthorized access IS validated as IDOR', () => {
      const candidate = {
        title: 'Broken Object Level Authorization (IDOR)',
        category: 'IDOR',
        affected_asset: 'https://example.com/api/users?id=102',
        evidence: [
          'Logged in as User A (id=101)',
          'Requested record of User B (id=102)',
          'Cross-user access confirmed: User B private profile, email, and billing records returned',
        ],
        validation: {
          testPerformed: 'Changed resource identifier from 101 to 102 under User A session',
          expectedBehavior: 'HTTP 403 Forbidden',
          observedBehavior: 'Unauthorized cross-user data access granted for User B',
          securityImplication: 'Complete horizontal privilege escalation allowing arbitrary user data reading',
          outcome: 'validated' as const,
        },
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, false);
      assert.strictEqual(result.recommendedStatus, 'validated');
      assert.strictEqual(result.recommendedConfidence, 'HIGH');

      const finalConf = calculateConfidence(candidate.validation, 3, true, true);
      assert.strictEqual(finalConf, 'CONFIRMED');

      const severity = calculateSeverity(candidate.category, candidate.validation.securityImplication, 'validated', 'user');
      assert.strictEqual(severity, 'HIGH');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Static Assets & Public JavaScript
  // --------------------------------------------------------------------------
  describe('Rule 3: Static Assets & Public JavaScript', () => {
    it('public JS bundle file is NOT automatically information disclosure', () => {
      const candidate = {
        title: 'Internal Route Leak in JavaScript Bundle',
        category: 'Information Disclosure',
        affected_asset: 'https://example.com/_next/static/chunks/main-app.js',
        evidence: ['Found strings "/api/v1/billing" and "/dashboard/admin" in compiled JS'],
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.isInformationalOnly, true);
      assert.strictEqual(result.recommendedStatus, 'informational');
      assert.strictEqual(result.recommendedSeverity, 'INFO');
      assert.match(result.benignExplanation, /Static assets.*are intentionally public/i);
    });

    it('sitemap.xml and favicon.ico are treated as informational static assets', () => {
      const sitemapCandidate = {
        title: 'Sitemap Discovered',
        category: 'Information Disclosure',
        affected_asset: 'https://example.com/sitemap.xml',
        evidence: ['HTTP 200 for sitemap.xml'],
      };
      const result = evaluateCandidateAgainstBenignExplanations(sitemapCandidate);
      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.recommendedStatus, 'informational');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Exposed Secrets Context: Production vs Mock/Test
  // --------------------------------------------------------------------------
  describe('Rule 4: Secrets Context & Mock Filtering', () => {
    it('test mock credentials in test file are suppressed as non-vulnerabilities', () => {
      const candidate = {
        title: 'Hardcoded API Key',
        category: 'Hardcoded Secrets',
        affected_asset: 'tests/auth.test.ts',
        evidence: ['sk_live_dummy123456789012345678 in mock authorization fixture'],
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.recommendedStatus, 'suppressed');
      assert.match(result.benignExplanation, /test\/mock fixtures or template documentation/i);
    });

    it('public publishable key (pk_live_...) is suppressed as benign public identifier', () => {
      const candidate = {
        title: 'Exposed Stripe Key',
        category: 'Hardcoded Secrets',
        affected_asset: 'src/config/stripe.ts',
        evidence: ['const stripeKey = "pk_live_999988887777666655554444"'],
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.recommendedStatus, 'suppressed');
      assert.match(result.benignExplanation, /public client-side token/i);
    });

    it('valid private credential in production code is classified as real security finding', () => {
      const candidate = {
        title: 'Hardcoded AWS Production Key',
        category: 'Hardcoded Secrets',
        affected_asset: 'src/services/s3Service.ts',
        evidence: ['AKIAIOSFODNN7EXAMPLE AWS key embedded directly in client instantiator'],
        validation: {
          testPerformed: 'Entropy and context analysis',
          expectedBehavior: 'Credentials loaded from process.env',
          observedBehavior: 'Production AWS access key hardcoded in service file',
          securityImplication: 'Unauthorized AWS infrastructure access',
          outcome: 'validated' as const,
        },
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, false);
      assert.strictEqual(result.recommendedStatus, 'validated');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Version Disclosure & Server Banners
  // --------------------------------------------------------------------------
  describe('Rule 5: Framework Fingerprints & Version Disclosures', () => {
    it('server banner alone is informational unless an active exploitable CVE is established', () => {
      const candidate = {
        title: 'Server Banner Version Disclosure',
        category: 'Information Disclosure',
        affected_asset: 'https://example.com',
        evidence: ['Server: nginx/1.18.0'],
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, true);
      assert.strictEqual(result.isInformationalOnly, true);
      assert.strictEqual(result.recommendedSeverity, 'INFO');
      assert.strictEqual(result.recommendedConfidence, 'LOW');
      assert.match(result.benignExplanation, /Version identification alone without a confirmed, reachable exploit/i);
    });
  });

  // --------------------------------------------------------------------------
  // 6. SQL Injection vs Generic Error Messages
  // --------------------------------------------------------------------------
  describe('Rule 6: Injection vs Generic Errors', () => {
    it('generic SQL error message without syntax manipulation is candidate, NOT confirmed SQLi', () => {
      const candidate = {
        title: 'SQL Injection via Search Field',
        category: 'SQLi',
        affected_asset: 'https://example.com/search?q=test',
        evidence: ['Response contained: Unhandled exception: error in your sql syntax near "test"'],
        validation: {
          testPerformed: 'Submitted query "test"',
          expectedBehavior: 'Clean error handling',
          observedBehavior: 'Verbose database error message returned',
          securityImplication: 'Verbose debugging discloses DB error',
          outcome: 'inconclusive' as const,
        },
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isFalsePositive, false);
      assert.strictEqual(result.recommendedStatus, 'candidate');
      assert.strictEqual(result.recommendedConfidence, 'LOW');
      assert.match(result.benignExplanation, /Database error messages indicate unhandled exceptions .* but do not prove SQL injection/i);
    });

    it('SQL injection with verified syntax control and data extraction is CONFIRMED', () => {
      const validation: ValidationRecord = {
        testPerformed: 'Injected boolean-based payload "\' OR 1=1 --"',
        expectedBehavior: 'Input escaped; identical result as search query',
        observedBehavior: 'Syntax controlled: query returned all records and time-delay payload sleep(5) delayed response by exactly 5012ms',
        securityImplication: 'Arbitrary SQL query execution and database compromise',
        outcome: 'validated',
      };

      const conf = calculateConfidence(validation, 3, true, true);
      assert.strictEqual(conf, 'CONFIRMED');

      const sev = calculateSeverity('SQLi', validation.securityImplication, 'validated', 'global');
      assert.strictEqual(sev, 'HIGH');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Missing Security Headers
  // --------------------------------------------------------------------------
  describe('Rule 7: Missing Security Headers', () => {
    it('missing CSP or HSTS headers are informational defense-in-depth posture items, NOT high vulnerabilities', () => {
      const candidate = {
        title: 'Missing Content-Security-Policy',
        category: 'Security Headers',
        affected_asset: 'https://example.com',
        evidence: ['Missing Content-Security-Policy', 'Missing Strict-Transport-Security'],
      };

      const result = evaluateCandidateAgainstBenignExplanations(candidate);

      assert.strictEqual(result.isInformationalOnly, true);
      assert.strictEqual(result.recommendedSeverity, 'LOW');
      assert.strictEqual(result.recommendedConfidence, 'MEDIUM');
      assert.match(result.benignExplanation, /defense-in-depth posture best practices/i);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Deduplication & Correlation
  // --------------------------------------------------------------------------
  describe('Deduplication & Correlation Engine', () => {
    it('merges 20 payload variations on the same endpoint into one consolidated finding', () => {
      const findings: SecurityFinding[] = [];
      for (let i = 1; i <= 20; i++) {
        findings.push({
          id: `f-${i}`,
          title: 'Reflected Cross-Site Scripting (XSS)',
          category: 'Cross-Site Scripting (XSS)',
          severity: 'MEDIUM',
          confidence: 'CONFIRMED',
          status: 'validated',
          affected_asset: 'https://example.com/search?q=payload' + i,
          description: 'XSS on search endpoint',
          evidence: [`Payload #${i} <script>alert(${i})</script> reflected in response without encoding`],
          validation: {
            testPerformed: `Injected vector #${i}`,
            expectedBehavior: 'HTML entities encoded',
            observedBehavior: 'Payload reflected in DOM unmodified',
            securityImplication: 'Client-side script execution in user session',
            outcome: 'validated',
          },
          impact: 'Session impersonation',
          reasoning: {
            hypothesis: 'Search input lacks output encoding',
            supportingFactors: [`Payload #${i} reflected`],
            benignExplanationConsidered: 'Checked if framework sanitizes DOM',
            decisionRationale: 'Unescaped reflection verified',
          },
          remediation: 'Use context-aware HTML entity encoding on search query reflection.',
        });
      }

      const deduplicated = correlateAndDeduplicateFindings(findings);

      assert.strictEqual(deduplicated.length, 1, 'Should consolidate 20 payloads on same endpoint into 1 finding');
      assert.strictEqual(deduplicated[0].evidence.length, 20, 'Should retain all 20 evidence items');
      assert.strictEqual(deduplicated[0].confidence, 'CONFIRMED');
      assert.strictEqual(deduplicated[0].severity, 'MEDIUM');
    });
  });

  // --------------------------------------------------------------------------
  // 9. Target Application Modeling & Precision Reporting
  // --------------------------------------------------------------------------
  describe('Target Profiling & Precision Reporting', () => {
    it('correctly models application architecture and generates precision-first report', () => {
      const observations: Observation[] = [
        {
          id: 'obs-1',
          type: 'technology',
          target: 'example.com',
          sourceTool: 'waf_detection_wafw00f',
          data: { waf: 'Cloudflare WAF', serverBanner: 'nginx/1.24.0' },
          description: 'Cloudflare WAF detected; Server: nginx/1.24.0',
          timestamp: Date.now(),
        },
        {
          id: 'obs-2',
          type: 'asset',
          target: 'https://example.com/robots.txt',
          sourceTool: 'vuln_template_scan_nuclei',
          data: { path: '/robots.txt' },
          description: '/robots.txt discovered with crawling rules',
          timestamp: Date.now(),
        },
        {
          id: 'obs-3',
          type: 'cookie',
          target: 'example.com',
          sourceTool: 'browser_web_exploration',
          data: { name: '__Secure-next-auth.session-token' },
          description: 'Auth cookie detected',
          timestamp: Date.now(),
        },
        {
          id: 'obs-4',
          type: 'endpoint',
          target: '/api/v1/users',
          sourceTool: 'browser_web_exploration',
          data: {},
          description: 'Discovered API endpoint',
          timestamp: Date.now(),
        },
      ];

      const model = buildTargetApplicationModel('https://example.com', observations);

      assert.strictEqual(model.targetHost, 'example.com');
      assert.strictEqual(model.authModel, 'cookie_session');
      assert.ok(model.technologies.includes('nginx/1.24.0'));
      assert.ok(model.apiEndpoints.includes('/api/v1/users'));

      // Generate report with zero confirmed vulnerabilities
      const report = formatTechnicalSecurityReport({
        model,
        observations,
        confirmedVulnerabilities: [],
        candidateFindings: [],
        suppressedOrBenign: [
          {
            id: 'benign-1',
            title: 'robots.txt Discovered',
            category: 'Reconnaissance',
            severity: 'INFO',
            confidence: 'LOW',
            status: 'informational',
            affected_asset: 'https://example.com/robots.txt',
            description: 'Robots.txt is standard crawler directives.',
            evidence: ['Disallow: /admin'],
            validation: {
              testPerformed: 'HTTP GET',
              expectedBehavior: 'Public crawler instructions',
              observedBehavior: 'Normal crawler directives',
              securityImplication: 'No sensitive data exposed',
              outcome: 'refuted',
            },
            impact: 'None',
            reasoning: {
              hypothesis: 'Information disclosure via crawler file',
              supportingFactors: ['Path in robots.txt'],
              benignExplanationConsidered: 'Standard search engine configuration',
              decisionRationale: 'Intentionally public file without access bypass',
            },
            remediation: 'No remediation required.',
          },
        ],
        diagnosticToolsCount: 4,
      });

      // Verify precision report standards
      assert.match(report, /Zero Confirmed High-Confidence Vulnerabilities Detected/);
      assert.match(report, /2\. Target Profile & Reconnaissance Observations/);
      assert.match(report, /5\. Evaluated Candidates & Benign Behaviors/);
      assert.doesNotMatch(report, /\| VULN-.*\| robots\.txt/); // robots.txt is NOT in the vulnerability matrix!
    });

    it('generates negative conclusion explaining why normal behavior is not a vulnerability', () => {
      const neg = generateNegativeConclusion(
        '/robots.txt',
        'The resource is intentionally public and no sensitive data is exposed.'
      );
      assert.match(neg, /Non-Vulnerability Assessment/);
      assert.match(neg, /intentionally public/);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Legitimate Vulnerability Preservation
  // --------------------------------------------------------------------------
  describe('Preservation of Legitimate Detections', () => {
    it('unauthenticated RCE with demonstrated execution is classified as CRITICAL and CONFIRMED', () => {
      const validation: ValidationRecord = {
        testPerformed: 'Sent command payload "; id;" to export endpoint',
        expectedBehavior: 'Execution rejected with 400 Bad Request',
        observedBehavior: 'Command executed; response returned "uid=1000(kairo) gid=1000(kairo)"',
        securityImplication: 'Direct arbitrary remote code execution on host',
        outcome: 'validated',
      };

      const conf = calculateConfidence(validation, 2, true, true);
      const sev = calculateSeverity('RCE', validation.securityImplication, 'validated', 'global');

      assert.strictEqual(conf, 'CONFIRMED');
      assert.strictEqual(sev, 'CRITICAL');
    });
  });
});
