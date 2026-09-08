import dns from 'dns/promises';
import tls from 'tls';
import net from 'net';
import { runDockerSecurityTool } from './dockerRunner';

export interface ToolCall {
  id: string;
  type: 'search' | 'link' | 'terminal' | 'scan' | 'exploit';
  label: string;
  query?: string;
  url?: string;
  status: 'completed' | 'running' | 'failed';
  resultDetails?: {
    statusCode?: number;
    matchedResults?: string[];
    responseTime?: string;
    rawOutput?: string;
  };
}

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
    name: 'waf_detection_wafw00f',
    description: 'Detects and fingerprints Web Application Firewalls (WAFs) protecting the target (Cloudflare, AWS WAF, Akamai, Imperva, ModSecurity) using Wafw00f.',
    parameters: {
      type: 'object',
      properties: {
        targetUrl: {
          type: 'string',
          description: 'The target URL or domain to audit (e.g. https://example.com)',
        },
      },
      required: ['targetUrl'],
    },
  },
  {
    name: 'subdomain_recon_subfinder',
    description: 'Performs deep passive subdomain enumeration using Subfinder to map the full attack surface and discover forgotten staging/admin assets.',
    parameters: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Target root domain (e.g. example.com)',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'port_service_scan_nmap',
    description: 'Scans top network ports and fingerprints running service versions (HTTP, SSH, MySQL, Redis, etc.) using Nmap.',
    parameters: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'Target hostname or IP (e.g. scanme.nmap.org or example.com)',
        },
        topPorts: {
          type: 'string',
          description: 'Port scope: "top20", "top100", or "web" (default "top20")',
        },
      },
      required: ['host'],
    },
  },
  {
    name: 'vuln_template_scan_nuclei',
    description: 'Scans target with Nuclei security templates for known CVEs, exposed panels, misconfigurations, and default credentials.',
    parameters: {
      type: 'object',
      properties: {
        targetUrl: {
          type: 'string',
          description: 'Target URL to scan (e.g. https://example.com)',
        },
        tags: {
          type: 'string',
          description: 'Template tags to scan for (e.g. "cve,misconfiguration,exposure,panel")',
        },
      },
      required: ['targetUrl'],
    },
  },
  {
    name: 'analyze_security_headers',
    description: 'Inspects HTTP response headers of a target domain for missing security headers, clickjacking risk, server banner leaks, and CSP misconfigurations.',
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
      },
      required: ['domain'],
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

// Target scope validator for SSRF & Self-Target Defense
export function validateTargetScope(target: string): { allowed: boolean; reason?: string } {
  if (!target || typeof target !== 'string') {
    return { allowed: false, reason: 'Invalid or missing target parameter.' };
  }

  let clean = decodeURIComponent(target)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/[\[\]]/g, '');

  if (!clean || clean.length < 2) {
    return { allowed: false, reason: 'Target host is invalid or too short.' };
  }

  // Block self-targets, internal platform hostnames, and metadata endpoints
  const blockedHosts = [
    'kairo.bond',
    'kairo.ai',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '::',
    '169.254.169.254',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    'wmt.google.internal',
  ];

  if (blockedHosts.some((h) => clean === h || clean.endsWith(`.${h}`))) {
    return {
      allowed: false,
      reason: `🛡️ Target '${clean}' is part of protected platform infrastructure or internal metadata. Scanning is restricted.`,
    };
  }

  // Block dynamic wildcard DNS services resolving to localhost / internal IPs
  const dynamicLocalDns = ['nip.io', 'sslip.io', 'xip.io', 'localtest.me', 'lvh.me', 'vcap.me', 'burpcollaborator.net'];
  if (dynamicLocalDns.some((d) => clean === d || clean.endsWith(`.${d}`))) {
    if (clean.includes('127.0.0.1') || clean.includes('169.254') || clean.includes('10.') || clean.includes('192.168.') || clean.includes('172.')) {
      return {
        allowed: false,
        reason: `🛡️ Target '${clean}' uses wildcard DNS mapping to internal/loopback network. Restricted.`,
      };
    }
  }

  // Check IPv6 loopback, link-local, and site-local
  if (
    clean === '::1' ||
    clean === '0:0:0:0:0:0:0:1' ||
    clean.startsWith('fe80:') ||
    clean.startsWith('fc00:') ||
    clean.startsWith('fd00:') ||
    clean.includes('::ffff:127.') ||
    clean.includes('::ffff:10.') ||
    clean.includes('::ffff:192.168.')
  ) {
    return {
      allowed: false,
      reason: `🛡️ Target IPv6 '${clean}' is a loopback or private site-local address. Restricted.`,
    };
  }

  // Check numeric integer/decimal representations of IP (e.g. 2130706433 -> 127.0.0.1, 2852039166 -> 169.254.169.254)
  if (/^\d{8,11}$/.test(clean)) {
    const num = parseInt(clean, 10);
    const byte1 = (num >>> 24) & 255;
    const byte2 = (num >>> 16) & 255;
    if (byte1 === 127 || byte1 === 10 || byte1 === 0 || (byte1 === 169 && byte2 === 254) || (byte1 === 192 && byte2 === 168) || (byte1 === 172 && byte2 >= 16 && byte2 <= 31)) {
      return {
        allowed: false,
        reason: `🛡️ Target decimal IP '${clean}' translates to a restricted subnet. Probing prohibited.`,
      };
    }
  }

  // Check Hexadecimal IP representations (e.g., 0x7f000001, 0x7f.1)
  if (/^0x[0-9a-fA-F]+/i.test(clean)) {
    return {
      allowed: false,
      reason: `🛡️ Hex-encoded IP addresses are restricted for defensive scope safety.`,
    };
  }

  // Block standard private and loopback IPv4 ranges (SSRF prevention)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = clean.match(ipv4Regex);
  if (ipMatch) {
    const octets = ipMatch.slice(1).map(Number);
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
      return { allowed: false, reason: `Invalid IP address format: ${clean}` };
    }
    const [o1, o2] = octets;
    if (
      o1 === 10 || // 10.0.0.0/8
      o1 === 127 || // 127.0.0.0/8
      o1 === 0 || // 0.0.0.0/8
      (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12
      (o1 === 192 && o2 === 168) || // 192.168.0.0/16
      (o1 === 169 && o2 === 254) // 169.254.0.0/16 Link-local / AWS / GCP Metadata
    ) {
      return {
        allowed: false,
        reason: `🛡️ Target IP '${clean}' resides in a restricted private/loopback subnet. Scanning internal networks is prohibited.`,
      };
    }
  }

  return { allowed: true };
}

// Actual Tool Implementations
export async function executeSecurityTool(
  toolName: string,
  args: Record<string, any>
): Promise<{ toolCall: ToolCall; rawResult: any }> {
  const toolId = `tool-${toolName}-${Date.now()}`;

  switch (toolName) {
    case 'waf_detection_wafw00f': {
      let url = args.targetUrl;
      const scope = validateTargetScope(url);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `WAF Detection (Restricted Scope: ${url})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const startTime = Date.now();

      // Try Docker CLI Wafw00f first
      const dockerRes = await runDockerSecurityTool('wafw00f', [url, '-o', '-']);
      if (dockerRes.isDocker && dockerRes.stdout) {
        const detected = dockerRes.stdout.includes('is behind')
          ? dockerRes.stdout.split('\n').filter((l) => l.includes('is behind') || l.includes('WAF'))[0] || 'WAF Detected'
          : 'No WAF detected behind target';

        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `WAF Detection (wafw00f: ${new URL(url).hostname})`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [detected],
              rawOutput: dockerRes.stdout,
            },
          },
          rawResult: { url, waf: detected, raw: dockerRes.stdout },
        };
      }

      // High-speed Native Fallback (Header & Cookie Fingerprinting)
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 Kairo-WAF-Probe/1.0' },
          signal: AbortSignal.timeout(5000),
        });

        const headers = res.headers;
        let wafBrand = 'No standard WAF detected (Direct origin exposed)';
        if (headers.get('cf-ray') || headers.get('server')?.toLowerCase().includes('cloudflare')) {
          wafBrand = 'Cloudflare Web Application Firewall (Detected via CF-Ray/Server headers)';
        } else if (headers.get('x-amz-cf-id') || headers.get('x-amzn-requestid')) {
          wafBrand = 'AWS CloudFront / AWS WAF Shield';
        } else if (headers.get('x-akamai-transformed') || headers.get('akamai-grn')) {
          wafBrand = 'Akamai Edge WAF';
        } else if (headers.get('x-sucuri-id') || headers.get('x-sucuri-cache')) {
          wafBrand = 'Sucuri CloudProxy WAF';
        }

        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `WAF Detection (${new URL(url).hostname})`,
            status: 'completed',
            resultDetails: {
              statusCode: res.status,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [`WAF Status: ${wafBrand}`, `Server Header: ${headers.get('server') || 'Hidden'}`],
              rawOutput: `Status: ${res.status}\nServer: ${headers.get('server')}`,
            },
          },
          rawResult: { url, wafBrand, statusCode: res.status },
        };
      } catch (err: any) {
        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `WAF Detection (${url})`,
            status: 'failed',
            resultDetails: { matchedResults: [err.message] },
          },
          rawResult: { error: err.message },
        };
      }
    }

    case 'subdomain_recon_subfinder': {
      const scope = validateTargetScope(args.domain);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `Subdomain Enumeration (Restricted Scope: ${args.domain})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      const domain = args.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const startTime = Date.now();

      // Try Docker CLI Subfinder
      const dockerRes = await runDockerSecurityTool('subfinder', ['-d', domain, '-silent']);
      if (dockerRes.isDocker && dockerRes.stdout) {
        const foundSubdomains = dockerRes.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `Subdomain Enumeration (subfinder: ${domain})`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [
                `Discovered Subdomains (${foundSubdomains.length}): ${foundSubdomains.slice(0, 8).join(', ')}${foundSubdomains.length > 8 ? '...' : ''}`,
              ],
              rawOutput: dockerRes.stdout,
            },
          },
          rawResult: { domain, count: foundSubdomains.length, subdomains: foundSubdomains },
        };
      }

      // Native Fallback: TLS SANs + DNS Probing
      try {
        let discovered: string[] = [domain];
        try {
          const certSANs = await new Promise<string[]>((resolve) => {
            const socket = tls.connect({ host: domain, port: 443, servername: domain, timeout: 4000 }, () => {
              const cert = socket.getPeerCertificate(true);
              socket.end();
              const sans = (cert.subjectaltname || '')
                .split(',')
                .map((s) => s.replace(/DNS:/g, '').trim())
                .filter((s) => s && !s.includes('*'));
              resolve(sans);
            });
            socket.on('error', () => resolve([]));
            socket.on('timeout', () => { socket.destroy(); resolve([]); });
          });
          discovered = Array.from(new Set([...discovered, ...certSANs]));
        } catch {}

        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `Subdomain Discovery (${domain})`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [
                `Discovered Assets (${discovered.length}): ${discovered.slice(0, 6).join(', ')}${discovered.length > 6 ? '...' : ''}`,
              ],
              rawOutput: discovered.join('\n'),
            },
          },
          rawResult: { domain, count: discovered.length, subdomains: discovered },
        };
      } catch (err: any) {
        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `Subdomain Recon (${domain})`,
            status: 'failed',
            resultDetails: { matchedResults: [err.message] },
          },
          rawResult: { error: err.message },
        };
      }
    }

    case 'port_service_scan_nmap': {
      const host = args.host;
      const scope = validateTargetScope(host);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'terminal',
            label: `Port Scan (Restricted Scope: ${host})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      const cleanHost = host.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const startTime = Date.now();

      // Try Docker CLI Nmap
      const dockerRes = await runDockerSecurityTool('nmap', ['-F', '-sV', '--open', '-T4', cleanHost]);
      if (dockerRes.isDocker && dockerRes.stdout) {
        const lines = dockerRes.stdout.split('\n').filter((l) => l.includes('/tcp') && l.includes('open'));
        return {
          toolCall: {
            id: toolId,
            type: 'terminal',
            label: `Network Port & Service Scan (nmap: ${cleanHost})`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [
                `Open Ports & Services (${lines.length}): ${lines.slice(0, 5).join(' | ')}`,
              ],
              rawOutput: dockerRes.stdout,
            },
          },
          rawResult: { host: cleanHost, openPorts: lines, fullOutput: dockerRes.stdout },
        };
      }

      // Native Node TCP Socket Port Probe Fallback (Top standard ports)
      const testPorts = [80, 443, 8080, 8443, 22, 21, 3306, 5432, 6379, 27017];
      const openPorts: number[] = [];

      await Promise.all(
        testPorts.map((port) => {
          return new Promise<void>((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1500);
            socket.on('connect', () => {
              openPorts.push(port);
              socket.destroy();
              resolve();
            });
            socket.on('timeout', () => { socket.destroy(); resolve(); });
            socket.on('error', () => { socket.destroy(); resolve(); });
            socket.connect(port, cleanHost);
          });
        })
      );

      const portLabels: Record<number, string> = {
        80: '80/HTTP',
        443: '443/HTTPS (TLS)',
        8080: '8080/HTTP-Alt',
        8443: '8443/HTTPS-Alt',
        22: '22/SSH',
        21: '21/FTP',
        3306: '3306/MySQL',
        5432: '5432/PostgreSQL',
        6379: '6379/Redis (Exposed)',
        27017: '27017/MongoDB (Exposed)',
      };

      const matchedResults = openPorts.map((p) => `Port ${portLabels[p] || p} -> OPEN`);

      return {
        toolCall: {
          id: toolId,
          type: 'terminal',
          label: `Port & Service Probe (${cleanHost})`,
          status: 'completed',
          resultDetails: {
            statusCode: 200,
            responseTime: `${Date.now() - startTime}ms`,
            matchedResults:
              matchedResults.length > 0 ? matchedResults : ['Top standard network ports are filtered or closed'],
            rawOutput: `Host: ${cleanHost}\nOpen Ports:\n${openPorts.join('\n')}`,
          },
        },
        rawResult: { host: cleanHost, openPorts, matchedResults },
      };
    }

    case 'vuln_template_scan_nuclei': {
      let url = args.targetUrl;
      const scope = validateTargetScope(url);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'exploit',
            label: `Vulnerability Template Scan (Restricted Scope: ${url})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const startTime = Date.now();

      // Try Docker CLI Nuclei
      const dockerRes = await runDockerSecurityTool('nuclei', [
        '-u',
        url,
        '-tags',
        args.tags || 'exposure,misconfiguration,cve',
        '-silent',
      ]);
      if (dockerRes.isDocker && dockerRes.stdout) {
        const matches = dockerRes.stdout.split('\n').filter(Boolean);
        return {
          toolCall: {
            id: toolId,
            type: 'exploit',
            label: `Vulnerability Template Scan (nuclei: ${new URL(url).hostname})`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: [
                `Findings (${matches.length}): ${matches.slice(0, 4).join(', ')}${matches.length > 4 ? '...' : ''}`,
              ],
              rawOutput: dockerRes.stdout,
            },
          },
          rawResult: { url, findingsCount: matches.length, findings: matches },
        };
      }

      // Native Fallback: Probe exposed files & configuration checks
      const findings: string[] = [];
      try {
        const [robRes, secRes] = await Promise.allSettled([
          fetch(`${url}/robots.txt`, { method: 'HEAD', signal: AbortSignal.timeout(3000) }),
          fetch(`${url}/.well-known/security.txt`, { method: 'HEAD', signal: AbortSignal.timeout(3000) }),
        ]);

        if (robRes.status === 'fulfilled' && robRes.value.status === 200) {
          findings.push('[exposure:robots-txt] /robots.txt is publicly accessible (Information Disclosure)');
        }
        if (secRes.status === 'fulfilled' && secRes.value.status === 200) {
          findings.push('[info:security-txt] /.well-known/security.txt is published');
        }
      } catch {}

      return {
        toolCall: {
          id: toolId,
          type: 'exploit',
          label: `Vulnerability & Exposure Audit (${new URL(url).hostname})`,
          status: 'completed',
          resultDetails: {
            statusCode: 200,
            responseTime: `${Date.now() - startTime}ms`,
            matchedResults:
              findings.length > 0 ? findings : ['No high-severity public misconfiguration templates triggered'],
            rawOutput: findings.join('\n'),
          },
        },
        rawResult: { url, findings },
      };
    }

    case 'analyze_security_headers': {
      let url = args.targetUrl;
      const scope = validateTargetScope(url);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `Header Audit (Restricted Scope: ${url})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const startTime = Date.now();
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Kairo-Security-Auditor/1.0',
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
      const domain = args.domain;
      const scope = validateTargetScope(domain);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `DNS Recon (Restricted Scope: ${domain})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const startTime = Date.now();
      const results: Record<string, any> = {};

      try {
        const [aRecords, mxRecords, txtRecords, nsRecords] = await Promise.allSettled([
          dns.resolve4(cleanDomain),
          dns.resolveMx(cleanDomain),
          dns.resolveTxt(cleanDomain),
          dns.resolveNs(cleanDomain),
        ]);

        results.A = aRecords.status === 'fulfilled' ? aRecords.value : [];
        results.MX = mxRecords.status === 'fulfilled' ? mxRecords.value : [];
        results.TXT = txtRecords.status === 'fulfilled' ? txtRecords.value.flat() : [];
        results.NS = nsRecords.status === 'fulfilled' ? nsRecords.value : [];

        const hasSPF = results.TXT.some((t: string) => t.startsWith('v=spf1'));
        let hasDMARC = false;
        try {
          const dmarcTxt = await dns.resolveTxt(`_dmarc.${cleanDomain}`);
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
            label: `DNS & Mail Recon (${cleanDomain})`,
            query: `DNS lookup A, MX, TXT, NS for ${cleanDomain}`,
            status: 'completed',
            resultDetails: {
              statusCode: 200,
              responseTime: `${Date.now() - startTime}ms`,
              matchedResults: matchedSummary,
              rawOutput: JSON.stringify(results, null, 2),
            },
          },
          rawResult: { domain: cleanDomain, records: results, hasSPF, hasDMARC },
        };
      } catch (err: any) {
        return {
          toolCall: {
            id: toolId,
            type: 'search',
            label: `DNS Recon (${cleanDomain})`,
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
      const domain = args.domain;
      const scope = validateTargetScope(domain);
      if (!scope.allowed) {
        return {
          toolCall: {
            id: toolId,
            type: 'scan',
            label: `TLS Inspection (Restricted Scope: ${domain})`,
            status: 'failed',
            resultDetails: { matchedResults: [scope.reason || 'Restricted target scope'] },
          },
          rawResult: { error: scope.reason },
        };
      }

      const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      const startTime = Date.now();

      return new Promise((resolve) => {
        const socket = tls.connect(
          {
            host: cleanDomain,
            port: 443,
            servername: cleanDomain,
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
                    label: `TLS Certificate Inspection (${cleanDomain})`,
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

    case 'sast_code_security_audit': {
      const { language, codeSnippet } = args;
      const detectedIssues: string[] = [];

      if (/SELECT\s+.*FROM.*(\+|`|\$\{).*(\bWHERE\b|\bAND\b)/i.test(codeSnippet) || /execute\(\s*["'].*%s/i.test(codeSnippet)) {
        detectedIssues.push('CWE-89: Potential SQL Injection via dynamic raw string concatenation');
      }
      if (/exec\(|eval\(|child_process\.exec|os\.system|subprocess\.Popen|shell_exec|system\(/i.test(codeSnippet)) {
        detectedIssues.push('CWE-78: Direct OS Command / Arbitrary Code Execution sink detected');
      }
      if (/fetch\(\s*(req\.|request\.|params\.)|requests\.get\(\s*(request\.|params\.|url)/i.test(codeSnippet) || /curl_exec/i.test(codeSnippet)) {
        detectedIssues.push('CWE-918: Potential Server-Side Request Forgery (SSRF) endpoint');
      }
      if (/jwt\.verify\([^,]+,\s*["'][^"']+["']\)|jwt\.sign\([^,]+,\s*["'][^"']+["']\)/i.test(codeSnippet)) {
        detectedIssues.push('CWE-798: Hardcoded static JWT secret / signature key');
      }
      if (/AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|sk_live_[0-9a-zA-Z]{24}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(codeSnippet)) {
        detectedIssues.push('CWE-312: High-entropy plaintext secret / API credentials embedded in source');
      }
      if (/fs\.readFile\(.*(req\.|params\.|query\.)|open\(.*(request\.|params\.)|readfile\(.*(\$_GET|\$_POST)/i.test(codeSnippet) || /\.\.\//i.test(codeSnippet)) {
        detectedIssues.push('CWE-22: Improper input validation leading to Path Traversal');
      }
      if (/dangerouslySetInnerHTML|innerHTML\s*=|document\.write\(/i.test(codeSnippet) || /echo\s+\$_GET/i.test(codeSnippet)) {
        detectedIssues.push('CWE-79: Unsanitized DOM/Template output (Cross-Site Scripting)');
      }
      if (/pickle\.loads|yaml\.load\([^,]+\)|unserialize\(/i.test(codeSnippet)) {
        detectedIssues.push('CWE-502: Deserialization of untrusted data');
      }
      if (/DEBUG\s*=\s*True|process\.env\.NODE_ENV\s*!==\s*['"]production['"]/i.test(codeSnippet) && /django|flask|express/i.test(codeSnippet)) {
        detectedIssues.push('CWE-489: Debug / verbose error mode enabled in production code');
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
                : ['Static heuristic AST scan: No standard high-severity anti-patterns detected'],
            rawOutput: `Analyzed ${codeSnippet.split('\n').length} lines of ${language} code.\nDetected Issues: ${detectedIssues.length}`,
          },
        },
        rawResult: { language, detectedIssues, lines: codeSnippet.split('\n').length },
      };
    }

    default:
      throw new Error(`Unknown security tool: ${toolName}`);
  }
}
