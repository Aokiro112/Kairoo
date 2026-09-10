import { chromium, Browser, Page } from 'playwright';

export interface FormInputDetail {
  name: string;
  type: string;
  id?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
}

export interface FormDetail {
  id?: string;
  action: string;
  method: string;
  inputs: FormInputDetail[];
  hasCsrfToken: boolean;
}

export interface BrowserInspectionResult {
  url: string;
  finalUrl: string;
  httpStatus: number;
  pageTitle: string;
  forms: FormDetail[];
  buttons: Array<{ text: string; id?: string; type?: string }>;
  links: Array<{ text: string; href: string; isExternal: boolean }>;
  securityFindings: string[];
  consoleLogs: Array<{ type: string; text: string }>;
  cookies: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite?: string }>;
  screenshotBase64?: string;
}

let browserInstance: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
        ],
      })
      .then((b) => {
        browserInstance = b;
        browserPromise = null;
        return b;
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

/**
 * Fast HTTP/HTML Fallback Inspector:
 * Extracts DOM forms, buttons, links, security headers, and cookies directly over HTTP
 * if headless Chromium is unavailable in minimal cloud container environments.
 */
async function fallbackHttpInspect(targetUrl: string): Promise<BrowserInspectionResult> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KairoSecurityAudit/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    }).finally(() => clearTimeout(timer));

    const html = await response.text();
    const finalUrl = response.url || normalizedUrl;
    const httpStatus = response.status;

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : new URL(normalizedUrl).hostname;

    // Forms and inputs
    const forms: FormDetail[] = [];
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch;
    while ((formMatch = formRegex.exec(html)) !== null) {
      const formAttrs = formMatch[1];
      const formBody = formMatch[2];

      const actionMatch = formAttrs.match(/action=["']([^"']*)["']/i);
      const methodMatch = formAttrs.match(/method=["']([^"']*)["']/i);
      const idMatch = formAttrs.match(/id=["']([^"']*)["']/i);

      const inputs: FormInputDetail[] = [];
      const inputRegex = /<(?:input|textarea|select)\b([^>]*)>/gi;
      let inpMatch;
      while ((inpMatch = inputRegex.exec(formBody)) !== null) {
        const inpAttrs = inpMatch[1];
        const nameMatch = inpAttrs.match(/name=["']([^"']*)["']/i);
        const typeMatch = inpAttrs.match(/type=["']([^"']*)["']/i);
        const inpIdMatch = inpAttrs.match(/id=["']([^"']*)["']/i);
        const placeholderMatch = inpAttrs.match(/placeholder=["']([^"']*)["']/i);
        const reqMatch = /\brequired\b/i.test(inpAttrs);

        if (nameMatch || inpIdMatch) {
          inputs.push({
            name: nameMatch ? nameMatch[1] : '',
            type: typeMatch ? typeMatch[1] : 'text',
            id: inpIdMatch ? inpIdMatch[1] : undefined,
            placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
            required: reqMatch,
          });
        }
      }

      const csrfRegex = /(csrf|token|_token|authenticity_token|nonce|xsrf)/i;
      const hasCsrfToken = inputs.some((inp) => csrfRegex.test(inp.name) || (inp.id && csrfRegex.test(inp.id)));

      forms.push({
        id: idMatch ? idMatch[1] : undefined,
        action: actionMatch ? actionMatch[1] : finalUrl,
        method: (methodMatch ? methodMatch[1] : 'GET').toUpperCase(),
        inputs,
        hasCsrfToken,
      });
    }

    // Buttons
    const buttons: Array<{ text: string; id?: string; type?: string }> = [];
    const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    let btnMatch;
    while ((btnMatch = btnRegex.exec(html)) !== null && buttons.length < 20) {
      const text = btnMatch[2].replace(/<[^>]+>/g, '').trim().slice(0, 50);
      if (text) buttons.push({ text, type: 'button' });
    }

    // Links
    const links: Array<{ text: string; href: string; isExternal: boolean }> = [];
    const linkRegex = /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    const targetHost = new URL(finalUrl).hostname;
    while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 30) {
      const href = linkMatch[1];
      const text = linkMatch[2].replace(/<[^>]+>/g, '').trim().slice(0, 60);
      if (href.startsWith('http')) {
        let isExternal = false;
        try {
          isExternal = new URL(href).hostname !== targetHost;
        } catch {}
        links.push({ text: text || href, href: href.slice(0, 150), isExternal });
      }
    }

    // Security Headers & Findings
    const securityFindings: string[] = [];
    const headers = response.headers;
    const missingHeaders: string[] = [];
    if (!headers.get('content-security-policy')) missingHeaders.push('Content-Security-Policy');
    if (!headers.get('x-frame-options')) missingHeaders.push('X-Frame-Options');
    if (!headers.get('strict-transport-security') && finalUrl.startsWith('https://')) missingHeaders.push('Strict-Transport-Security (HSTS)');
    if (!headers.get('x-content-type-options')) missingHeaders.push('X-Content-Type-Options');

    if (missingHeaders.length > 0) {
      securityFindings.push(`Missing HTTP Security Headers: ${missingHeaders.join(', ')}.`);
    }

    if (normalizedUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      securityFindings.push('Insecure Transport: Target uses unencrypted HTTP and does not enforce HTTPS redirection.');
    }

    for (const form of forms) {
      if (form.method === 'POST' && !form.hasCsrfToken) {
        securityFindings.push(`CSRF Exposure: POST Form (action: "${form.action}") does not include standard CSRF anti-forgery tokens.`);
      }
    }

    // Cookies from Set-Cookie header
    const rawCookies = headers.get('set-cookie') || '';
    const cookies: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite?: string }> = [];
    if (rawCookies) {
      const cookieParts = rawCookies.split(/,(?=\s*[^;=]+=[^;=]+)/);
      for (const part of cookieParts) {
        const nameVal = part.split(';')[0]?.trim();
        const cookieName = nameVal?.split('=')[0]?.trim();
        if (cookieName) {
          const secure = /;\s*secure/i.test(part);
          const httpOnly = /;\s*httponly/i.test(part);
          const sameSiteMatch = part.match(/;\s*samesite=([^;]+)/i);
          cookies.push({
            name: cookieName,
            secure,
            httpOnly,
            sameSite: sameSiteMatch ? sameSiteMatch[1].trim() : undefined,
          });
        }
      }
    }

    return {
      url: normalizedUrl,
      finalUrl,
      httpStatus,
      pageTitle: pageTitle || new URL(normalizedUrl).hostname,
      forms,
      buttons,
      links,
      securityFindings,
      consoleLogs: [{ type: 'info', text: '[Fallback Engine] HTTP/HTML security & DOM analysis completed.' }],
      cookies,
      screenshotBase64: undefined,
    };
  } catch (err: any) {
    return {
      url: normalizedUrl,
      finalUrl: normalizedUrl,
      httpStatus: 0,
      pageTitle: new URL(normalizedUrl).hostname,
      forms: [],
      buttons: [],
      links: [],
      securityFindings: [`Connection Failed: ${err.message}`],
      consoleLogs: [{ type: 'error', text: err.message }],
      cookies: [],
    };
  }
}

export async function navigateAndInspectWebPage(
  targetUrl: string,
  options: { captureScreenshot?: boolean; timeout?: number } = {}
): Promise<BrowserInspectionResult> {
  const timeout = options.timeout || 8000;
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (launchErr: any) {
    console.warn(`[Browser Engine] Playwright launch unavailable (${launchErr.message}). Using HTTP fallback engine.`);
    return fallbackHttpInspect(normalizedUrl);
  }

  let context;
  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KairoSecurityAudit/1.0',
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
  } catch {
    return fallbackHttpInspect(normalizedUrl);
  }

  const page: Page = await context.newPage();

  // Speed optimization: Block heavy media, analytics, and third-party trackers
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    const url = route.request().url().toLowerCase();

    if (['media', 'font', 'websocket'].includes(resourceType)) {
      return route.abort().catch(() => {});
    }
    if (
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('doubleclick') ||
      url.includes('analytics') ||
      url.includes('connect.facebook.net')
    ) {
      return route.abort().catch(() => {});
    }
    route.continue().catch(() => {});
  });

  const consoleLogs: Array<{ type: string; text: string }> = [];

  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text().slice(0, 300) });
  });

  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'error', text: err.message.slice(0, 300) });
  });

  try {
    let httpStatus = 200;
    try {
      const response = await page.goto(normalizedUrl, {
        waitUntil: 'domcontentloaded',
        timeout,
      });
      httpStatus = response ? response.status() : 200;
      await page.waitForTimeout(500).catch(() => {});
    } catch (navErr: any) {
      console.warn(`[Browser Engine Warning] Navigation timeout on ${normalizedUrl} (${navErr.message}). Inspecting partial DOM.`);
    }

    const finalUrl = page.url() || normalizedUrl;
    const pageTitle = (await page.title().catch(() => '')) || new URL(normalizedUrl).hostname;

    // Extract forms, inputs, buttons, and links from the live DOM
    const domData = await page.evaluate(() => {
      const forms: Array<{
        id?: string;
        action: string;
        method: string;
        inputs: Array<{ name: string; type: string; id?: string; placeholder?: string; value?: string; required?: boolean }>;
        hasCsrfToken: boolean;
      }> = [];

      const formElements = Array.from(document.querySelectorAll('form'));
      for (const form of formElements) {
        const inputElements = Array.from(form.querySelectorAll('input, textarea, select'));
        const inputs = inputElements.map((el) => {
          const input = el as HTMLInputElement;
          return {
            name: input.name || '',
            type: input.type || el.tagName.toLowerCase(),
            id: input.id || undefined,
            placeholder: input.placeholder || undefined,
            value: input.value ? (input.type === 'password' ? '********' : input.value) : undefined,
            required: input.required,
          };
        });

        const csrfRegex = /(csrf|token|_token|authenticity_token|nonce|xsrf)/i;
        const hasCsrfToken = inputs.some((inp) => csrfRegex.test(inp.name) || (inp.id && csrfRegex.test(inp.id)));

        forms.push({
          id: form.id || undefined,
          action: form.action || window.location.href,
          method: (form.method || 'GET').toUpperCase(),
          inputs,
          hasCsrfToken,
        });
      }

      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a.button'))
        .slice(0, 20)
        .map((btn) => ({
          text: (btn.textContent || (btn as HTMLInputElement).value || '').trim().slice(0, 50),
          id: btn.id || undefined,
          type: (btn as HTMLButtonElement).type || btn.tagName.toLowerCase(),
        }))
        .filter((b) => b.text.length > 0);

      const targetHost = window.location.hostname;
      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 30)
        .map((a) => {
          const href = (a as HTMLAnchorElement).href;
          let isExternal = false;
          try {
            isExternal = new URL(href).hostname !== targetHost;
          } catch {
            isExternal = false;
          }
          return {
            text: (a.textContent || '').trim().slice(0, 60),
            href: href.slice(0, 150),
            isExternal,
          };
        })
        .filter((l) => l.href.startsWith('http'));

      return { forms, buttons, links };
    });

    const cookies = await context.cookies([normalizedUrl]);
    const formattedCookies = cookies.map((c) => ({
      name: c.name,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
    }));

    // Security heuristics analysis
    const securityFindings: string[] = [];

    if (normalizedUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      securityFindings.push('Insecure Transport: Target uses unencrypted HTTP and does not enforce HTTPS redirection.');
    }

    for (const form of domData.forms) {
      if (form.method === 'POST' && !form.hasCsrfToken) {
        securityFindings.push(`CSRF Exposure: POST Form (action: "${form.action}") does not include standard CSRF anti-forgery tokens.`);
      }
      const hasPassword = form.inputs.some((i) => i.type === 'password');
      if (hasPassword && !finalUrl.startsWith('https://')) {
        securityFindings.push('Critical Auth Leak: Password input detected over unencrypted plain HTTP transport.');
      }
    }

    for (const cookie of formattedCookies) {
      if (!cookie.secure) {
        securityFindings.push(`Insecure Cookie: Cookie "${cookie.name}" missing "Secure" flag.`);
      }
      if (!cookie.httpOnly && /session|auth|token|jwt|id/i.test(cookie.name)) {
        securityFindings.push(`Session Leak Risk: Sensitive cookie "${cookie.name}" missing "HttpOnly" flag (vulnerable to XSS theft).`);
      }
    }

    let screenshotBase64: string | undefined = undefined;
    if (options.captureScreenshot) {
      const buffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 65 }).catch(() => null);
      if (buffer) {
        screenshotBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      }
    }

    return {
      url: normalizedUrl,
      finalUrl,
      httpStatus,
      pageTitle: pageTitle || 'No Title Found',
      forms: domData.forms,
      buttons: domData.buttons,
      links: domData.links,
      securityFindings,
      consoleLogs: consoleLogs.slice(0, 15),
      cookies: formattedCookies,
      screenshotBase64,
    };
  } finally {
    await context.close();
  }
}

export async function capturePageScreenshot(
  targetUrl: string,
  options: { fullPage?: boolean; selector?: string } = {}
): Promise<{ screenshotDataUrl: string; pageTitle: string; httpStatus: number }> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err: any) {
    console.warn(`[Browser Engine] Screenshot unavailable in this environment: ${err.message}`);
    return {
      screenshotDataUrl: '',
      pageTitle: targetUrl,
      httpStatus: 200,
    };
  }

  let context;
  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
  } catch {
    return { screenshotDataUrl: '', pageTitle: targetUrl, httpStatus: 200 };
  }
  const page: Page = await context.newPage();

  try {
    let httpStatus = 200;
    try {
      const response = await page.goto(normalizedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 8000,
      });
      httpStatus = response ? response.status() : 200;
      await page.waitForTimeout(500).catch(() => {});
    } catch {
      // Proceed with screenshot even if page load timed out partially
    }

    const pageTitle = (await page.title().catch(() => '')) || targetUrl;

    let buffer: Buffer | null = null;
    if (options.selector) {
      const element = await page.$(options.selector).catch(() => null);
      if (element) {
        buffer = await element.screenshot({ type: 'jpeg', quality: 65 }).catch(() => null);
      }
    }
    if (!buffer) {
      buffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 65 }).catch(() => null);
    }

    return {
      screenshotDataUrl: buffer ? `data:image/jpeg;base64,${buffer.toString('base64')}` : '',
      pageTitle: pageTitle || targetUrl,
      httpStatus,
    };
  } finally {
    await context.close();
  }
}

export async function interactAndTestDOM(
  targetUrl: string,
  action: 'click' | 'fill_and_submit' | 'test_payload',
  selector: string,
  inputValue?: string
): Promise<{
  success: boolean;
  actionTaken: string;
  initialUrl: string;
  finalUrl: string;
  dialogsTriggered: string[];
  consoleErrors: string[];
  screenshotBase64?: string;
  domSnippet?: string;
}> {
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err: any) {
    return {
      success: false,
      actionTaken: `Interactive DOM test unavailable in minimal environment: ${err.message}`,
      initialUrl: normalizedUrl,
      finalUrl: normalizedUrl,
      dialogsTriggered: [],
      consoleErrors: [err.message],
    };
  }

  let context;
  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
  } catch (err: any) {
    return {
      success: false,
      actionTaken: `Context creation failed: ${err.message}`,
      initialUrl: normalizedUrl,
      finalUrl: normalizedUrl,
      dialogsTriggered: [],
      consoleErrors: [err.message],
    };
  }
  const page: Page = await context.newPage();

  const dialogsTriggered: string[] = [];
  const consoleErrors: string[] = [];

  page.on('dialog', async (dialog) => {
    dialogsTriggered.push(`[${dialog.type().toUpperCase()}] ${dialog.message()}`);
    await dialog.dismiss();
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text().slice(0, 300));
    }
  });

  try {
    await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const initialUrl = page.url();

    let actionTaken = '';

    if (action === 'click') {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.click(selector);
      await page.waitForTimeout(1000);
      actionTaken = `Clicked element: ${selector}`;
    } else if (action === 'fill_and_submit' || action === 'test_payload') {
      await page.waitForSelector(selector, { timeout: 5000 });
      await page.fill(selector, inputValue || '');
      actionTaken = `Filled "${selector}" with "${inputValue?.slice(0, 50)}"`;

      // Try pressing Enter or submitting form if applicable
      await page.press(selector, 'Enter').catch(() => {});
      await page.waitForTimeout(1500);
    }

    const finalUrl = page.url();
    const buffer = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 65 }).catch(() => null);
    const screenshotBase64 = buffer ? `data:image/jpeg;base64,${buffer.toString('base64')}` : undefined;

    const domSnippet = await page.evaluate(() => {
      return document.body ? document.body.innerText.slice(0, 1000) : '';
    });

    return {
      success: true,
      actionTaken,
      initialUrl,
      finalUrl,
      dialogsTriggered,
      consoleErrors,
      screenshotBase64,
      domSnippet,
    };
  } catch (err: any) {
    return {
      success: false,
      actionTaken: `Action failed: ${err.message}`,
      initialUrl: normalizedUrl,
      finalUrl: normalizedUrl,
      dialogsTriggered,
      consoleErrors: [err.message],
    };
  } finally {
    await context.close();
  }
}
