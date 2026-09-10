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

export async function navigateAndInspectWebPage(
  targetUrl: string,
  options: { captureScreenshot?: boolean; timeout?: number } = {}
): Promise<BrowserInspectionResult> {
  const timeout = options.timeout || 8000;
  const normalizedUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
    ? targetUrl
    : `https://${targetUrl}`;

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KairoSecurityAudit/1.0',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

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

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
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

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
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
