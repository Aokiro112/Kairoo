import { spawn } from 'child_process';

const CONTAINER_NAME = 'kairo-security-engine';

export interface ExecResult {
  success: boolean;
  isDocker: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Execute command inside Docker container or check availability
 */
export async function runDockerSecurityTool(
  binary: string,
  args: string[],
  timeoutMs: number = 25000
): Promise<ExecResult> {
  return new Promise((resolve) => {
    // Sanitize arguments (prevent shell injections)
    const sanitizedArgs = args.map((a) => a.replace(/[`$;|&><]/g, ''));
    const dockerArgs = ['exec', CONTAINER_NAME, binary, ...sanitizedArgs];

    let stdout = '';
    let stderr = '';
    let finished = false;

    const child = spawn('docker', dockerArgs, {
      timeout: timeoutMs,
    });

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (!finished) {
        finished = true;
        resolve({
          success: false,
          isDocker: false,
          stdout: '',
          stderr: err.message,
          code: 1,
        });
      }
    });

    child.on('close', (code) => {
      if (!finished) {
        finished = true;
        resolve({
          success: code === 0,
          isDocker: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code,
        });
      }
    });
  });
}
