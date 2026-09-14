# Security & Evidence-First Evaluation Guidelines

## Core Doctrine

> **Discovery is not a vulnerability.**
> A security finding requires **Context + Evidence + Safe Validation + Demonstrated Security Impact.**

## Three-Tier Knowledge Separation
- **Observation**: Reconnaissance discovery (e.g., `robots.txt`, `sitemap.xml`, server banner, public JS, normal API endpoint, parameter named `id`). Never report observations as vulnerabilities.
- **Candidate Vulnerability**: Hypothesis requiring investigation and controlled validation.
- **Validated Vulnerability**: Weakness with verified evidence of actual security impact.

## Anti-Confirmation Bias & Negative Conclusions
- Every candidate vulnerability must survive an attempt to explain the behavior as normal application behavior.
- If benign, document a negative conclusion explaining why it is normal operational behavior rather than escalating to an alert.

## False-Positive Suppression Rules
1. `/robots.txt` is an RFC-standard search crawler directive file. It is NEVER an information disclosure vulnerability alone. Only report if referenced paths actually lack authentication and expose sensitive resources.
2. Static assets, public JavaScript bundles, and sitemaps are intentionally public.
3. Server banners (`Server: nginx`) and version disclosure alone are informational, not vulnerabilities without verified exploitable CVE proof.
4. Missing HTTP security headers (CSP, HSTS, X-Frame-Options) are defense-in-depth posture indicators, not critical vulnerabilities.
5. Parameter names like `id` or `user_id` are standard REST architecture, NOT IDORs unless cross-user unauthorized access is verified.
6. Database error messages indicate unhandled errors, not confirmed SQLi without syntax control proof.
7. Test credentials, mock data, and documentation examples in test/mock files are not production secrets.

## Confidence Model
- **LOW**: Possible issue detected, insufficient evidence.
- **MEDIUM**: Strong indicators exist, but exploitability/impact is not demonstrated.
- **HIGH**: Multiple independent signals support the issue; validation strongly suggests vulnerability.
- **CONFIRMED**: Directly validated through safe testing with demonstrated impact.

## Severity Standard
- Severity depends strictly on demonstrated impact (Confidentiality, Integrity, Availability, Authentication Bypass, Privilege Escalation).
- Suspected critical issues with weak evidence must be capped at LOW/MEDIUM confidence candidates.
