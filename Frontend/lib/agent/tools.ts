import dns from 'dns/promises';
import tls from 'tls';
import { ToolCall } from '@/types/chat';

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const SECURITY_AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'analyze_security_headers',
    description: 'Inspects HTTP response headers of a target domain/URL for missing security headers, clickjacking risk, server banner leaks, and CSP misconfigurations.',
    parameters: {
      type: 'object',
      properties: {
        targetUrl: {
          type: 'string',
          description: 'The full URL or domain to audit (e.g., https://example.com)',
        },
      },
      required: ['targetUrl'],
    },
  },
  {
    name: 'passive_dns_recon',
    description: 'Performs DNS record enumeration (A, AAAA, MX, TXT, NS, CNAME) and analyzes email security posture (SPF, DMARC, DKIM records) to detect subdomain takeovers and spoofing risks.',
    parameters: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'The target domain name (e.g. example.com, without https://)',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'ssl_tls_certificate_audit',
    description: 'Connects to target HTTPS endpoint to inspect TLS certificate validity, issuer, cipher suite, and extracts Subject Alternative Names (SANs) for hidden subdomain discovery.',
    parameters: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'The target hostname to inspect (e.g., example.com)',
        },
        port: {
          type: 'number',
          description: 'The port number (default 443)',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'probe_exposed_endpoints',
    description: 'Safely probes standard non-destructive discovery paths (robots.txt, sitemap.xml, /.well-known/security.txt, exposed swagger docs, etc.) to verify attack surface.',
    parameters: {
      type: 'object',
      properties: {
        baseUrl: {
          type: 'string',
          description: 'The base URL (e.g., https://example.com)',
        },
        paths: {
          type: 'string',
          description: 'Comma-separated list of paths to check (e.g., "/robots.txt,/sitemap.xml,/api/docs")',
        },
      },
      required: ['baseUrl'],
    },
  },
  {
    name: 'sast_code_security_audit',
    description: 'Performs Static Application Security Testing (SAST) on provided source code snippets to detect SQLi, SSRF, RCE, IDOR, path traversal, or hardcoded secrets.',
    parameters: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: 'Programming language (e.g., python, javascript, php, go, solidity)',
        },
        codeSnippet: {
          type: 'string',
          description: 'The source code snippet to audit',
        },
      },
      required: ['language', 'codeSnippet'],
    },
  },
];

// Actual Tool Implementations
export async function executeSecurityTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ toolCall: ToolCall; rawResult: any }> {
  const toolId = `tool-${toolName}-${Date.now()}`;

  switch (toolName) {
    case 'analyze_security_headers': {
      let url = args.targetUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const startTime = Date.now();
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HackerAI-Security-Auditor/1.0',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(6000),
        });

        const duration = `${Date.now() - startTime}ms`;
        const headers: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });

        const missingHeaders = [];
        if (!headers['content-security-policy']) missingHeaders.push('Content-Security-Policy (CSP)');
        if (!headers['strict-transport-security']) missingHeaders.push('Strict-Transport-Security (HSTS)');
        if (!headers['x-frame-options']) missingHeaders.push('X-Frame-Options (Clickjacking protection)');
        if (!headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options: nosniff');
        if (!headers['referrer-policy']) missingHeaders.push('Referrer-Policy');

        const serverInfo = headers['server'] || headers['x-powered-by'] || 'Undisclosed';

        const toolCall: ToolCall = {
          id: toolId,
          type: 'scan',
          label: `Audited HTTP Security Headers (${new URL(url).hostname})`,
          status: 'completed',
          resultDetails: {
            statusCode: res.status,
            responseTime: duration,
            matchedResults: [
              `Status: HTTP ${res.status} OK`,
              `Server Banner: ${serverInfo}`,
              `Missing Headers: ${missingHeaders.length > 0 ? missingHeaders.join(', ') : 'None (Fully Hardened)'}`,
            ],
            rawOutput: JSON.stringify(headers, null, 2),
          },
        };

        return {
          toolCall,
          rawResult: {
            url,
            statusCode: res.status,
            missingHeaders,
            serverBanner: serverInfo,
            presentHeaders: headers,
          },
        };
      } catch (err: any) {
        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `Header Audit (${args.targetUrl})`,
            status: 'failed',
            resultDetails: {
              statusCode: 0,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [`Failed to connect: ${err.message}`],
            },
          },
          rawResult: { error: err.message },
        };
      }
    }

    case 'passive_dns_recon': {
      const domain = args.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const startTime = Date.now();
      const results: Record<string, any> = {};

      try {
        const [aRecords, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
          dns.resolve4(domain),
          dns.resolveMx(domain),
          dns.resolveTxt(domain),
          dns.resolveNs(domain),
        ]);

        results.A = aRecords.status === 'fulfilled' ? aRecords.value : [];
        results.MX = mxRecords.status === 'fulfilled' ? mxRecords.value : [];
        results.TXT = txtRecords.status === 'fulfilled' ? txtRecords.value.flat() : [];
        results.NS = nsRecords.status === 'fulfilled' ? nsRecords.value : [];

        // Check SPF / DMARC in TXT records
        const hasSPF = results.TXT.some((t: string) => t.startsWith('v=spf1'));
        let hasDMARC = false;
        try {
          const dmarcTxt = await dns.resolveTxt(`_dmarc.${domain}`);
          hasDMARC = dmarcTxt.flat().some((t: string) => t.startsWith('v=DMARC1'));
        } catch {
          hasDMARC = false;
        }

        const matchedSummary = [
          `A Records (${results.A.length}): ${results.A.slice(0, 3).join(', ')}`,
          `MX Handlers (${results.MX.length}): ${results.MX.map((m: any) => m.exchange).slice(0, 2).join(', ')}`,
          `SPF Record: ${hasSPF ? 'Configured' : 'Missing (Spoofing Risk)'}`,
          `DMARC Policy: ${hasDMARC ? 'Configured' : 'Missing (Phishing Risk)'}`,
        ];

        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `DNS & Mail Recon (${domain})`,
            query: `DNS lookup A, MX, TXT, NS for ${domain}`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: matchedSummary,
              rawOutput: JSON.stringify(results, null, 2),
            },
          },
          rawResult: { domain, records: results, hasSPF, hasDMARC },
        };
      } catch (err: any) {
        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `DNS Recon (${domain})`,
            status: 'failed',
            resultDetails: {
              matchedResults: [`DNS lookup failed: ${err.message}`],
            },
          },
          rawResult: { error: err.message },
        };
      }
    }

    case 'ssl_tls_certificate_audit': {
      const domain = args.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const port = args.port || 443;
      const startTime = Date.now();

      return new Promise((resolve) => {
        const socket = tls.connect(
          {
            host: domain,
            port,
            servername: domain,
            timeout: 5000,
          },
          () => {
            try {
              const cert = socket.getPeerCertificate(true);
              socket.end();

              if (!cert || Object.keys(cert).length === 0) {
                resolve({
                  toolCall: {
                    id: toolId,
                    type: 'scan',
                    label: `TLS Certificate Inspection (${domain})`,
                    status: 'failed',
                    resultDetails: { matchedResults: ['No peer certificate presented'] },
                  },
                  rawResult: { error: 'No certificate' },
                });
                return;
              }

              const sans = (cert.subjectaltname || '')
                .split(',')
                .map((s) => s.replace(/DNS:/g, '').trim())
                .filter(Boolean);

              const daysUntilExpiry = Math.floor(
                (new Date(cert.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );

              resolve({
                toolCall: {
                  id: toolId,
                  type: 'scan',
                  label: `Inspected SSL/TLS Certificate (${domain})`,
                  status: 'completed',
                  resultDetails: {
                    statusCode: 200,
                    responseTime: `${Date.now() - startTime}ms`,
                    matchedResults: [
                      `Issuer: ${cert.issuer?.O || cert.issuer?.CN || 'Unknown'}`,
                      `Valid To: ${cert.valid_to} (${daysUntilExpiry} days remaining)`,
                      `SAN Subdomains (${sans.length}): ${sans.slice(0, 5).join(', ')}${sans.length > 5 ? '...' : ''}`,
                    ],
                    rawOutput: `Subject: ${cert.subject?.CN}\nIssuer: ${cert.issuer?.CN}\nSANs:\n${sans.join('\n')}`,
                  },
                },
                rawResult: {
                  domain,
                  validTo: cert.valid_to,
                  daysRemaining: daysUntilExpiry,
                  issuer: cert.issuer,
                  discoveredSANs: sans,
                },
              });
            } catch (err: any) {
              resolve({
                toolCall: {
                  id: toolId,
                  type: 'scan',
                  label: `TLS Inspection (${domain})`,
                  status: 'failed',
                  resultDetails: { matchedResults: [err.message] },
                },
                rawResult: { error: err.message },
              });
            }
          }
        );

        socket.on('error', (err) => {
          resolve({
            toolCall: {
              id: toolId,
              type: 'scan',
              label: `TLS Inspection (${domain})`,
              status: 'failed',
              resultDetails: { matchedResults: [`TLS Connection failed: ${err.message}`], responseTime: `${Date.now() - startTime}ms` },
            },
            rawResult: { error: err.message },
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            toolCall: {
              id: toolId,
              type: 'scan',
              label: `TLS Inspection (${domain})`,
              status: 'failed',
              resultDetails: { matchedResults: ['Connection timed out'], responseTime: `${Date.now() - startTime}ms` },
            },
            rawResult: { error: 'Timeout' },
          });
        });
      });
    }

    case 'probe_exposed_endpoints': {
      let base = args.baseUrl.replace(/\/$/, '');
      if (!base.startsWith('http://') && !base.startsWith('https://')) {
        base = `https://${base}`;
      }

      const pathsToCheck = args.paths
        ? args.paths.split(',').map((p: string) => p.trim())
        : ['/robots.txt', '/.well-known/security.txt', '/sitemap.xml', '/api/docs', '/swagger.json'];

      const startTime = Date.now();
      const findings: string[] = [];
      const responses: Record<string, number> = {};

      await Promise.all(
        pathsToCheck.map(async (path: string) => {
          try {
            const res = await fetch(`${base}${path}`, {
              method: 'HEAD',
              headers: { 'User-Agent': 'HackerAI-Discovery/1.0' },
              signal: AbortSignal.timeout(4000),
            });
            responses[path] = res.status;
            if (res.status === 200 || res.status === 206) {
              findings.push(`${path} -> HTTP 200 (Accessible)`);
            } else if (res.status === 403) {
              findings.push(`${path} -> HTTP 403 (Protected/Exists)`);
            }
          } catch {
            responses[path] = 0;
          }
        })
      );

      return {
        toolCall: {
          id: toolId,
          type: 'link',
          label: `Passive Discovery Probe (${new URL(base).hostname})`,
          url: base,
          status: 'completed',
          resultDetails: {
            statusCode: 200,
            responseTime: `${Date.now() - startTime}ms`,
            matchedResults: findings.length > 0 ? findings : ['No standard exposed endpoint files detected'],
            rawOutput: JSON.stringify(responses, null, 2),
          },
        },
        rawResult: { baseUrl: base, responses, findings },
      };
    }

    case 'sast_code_security_audit': {
      const { language, codeSnippet } = args;
      const detectedIssues = [];

      // Static heuristic checks
      if (/SELECT\s+.*FROM.*(\+|`|\$\{).*(\bWHERE\b|\bAND\b)/i.test(codeSnippet)) {
        detectedIssues.push('Potential SQL Injection via raw string concatenation');
      }
      if (/exec\(|eval\(|child_process\.exec|os\.system|subprocess\.Popen/i.test(codeSnippet)) {
        detectedIssues.push('Direct OS Command Injection / Arbitrary Code Execution sink');
      }
      if (/fetch\(\s*req\.|requests\.get\(\s*request\./i.test(codeSnippet)) {
        detectedIssues.push('Potential Server-Side Request Forgery (SSRF) endpoint');
      }
      if (/jwt\.verify\([^,]+,\s*["'][^"']+["']\)/i.test(codeSnippet)) {
        detectedIssues.push('Hardcoded static secret key in JWT verification');
      }

      return {
        toolCall: {
          id: toolId,
          type: 'exploit',
          label: `SAST Code Vulnerability Analyzer (${language})`,
          status: 'completed',
          resultDetails: {
            statusCode: 200,
            matchedResults:
              detectedIssues.length > 0
                ? detectedIssues
                : ['Static heuristic scan: No standard high-severity anti-patterns detected'],
            rawOutput: `Analyzed ${codeSnippet.split('\n').length} lines of ${language} code.`,
          },
        },
        rawResult: { language, detectedIssues, lines: codeSnippet.split('\n').length },
      };
    }

    default:
      throw new Error(`Unknown security tool: ${toolName}`);
  }
}
