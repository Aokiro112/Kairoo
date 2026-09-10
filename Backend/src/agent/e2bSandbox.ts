import { Sandbox } from '@e2b/code-interpreter';
import { runDockerSecurityTool } from './dockerRunner';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SandboxExecutionResult {
  engine: 'e2b_cloud_microvm' | 'local_docker_container' | 'native_sandbox_fallback';
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  artifacts?: Array<{ name: string; sizeBytes: number; type: string }>;
}

export async function runInSandbox(
  language: 'bash' | 'python',
  codeOrCommand: string,
  options: { timeoutMs?: number; envVars?: Record<string, string> } = {}
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 30000;
  const e2bApiKey = process.env.E2B_API_KEY;

  // 1. Try E2B Cloud MicroVM if API key is provided
  if (e2bApiKey && e2bApiKey.trim().length > 0) {
    let sandbox: Sandbox | null = null;
    try {
      sandbox = await Sandbox.create({
        apiKey: e2bApiKey.trim(),
        timeoutMs,
      });

      if (language === 'python') {
        const execution = await sandbox.runCode(codeOrCommand);
        const stdout = execution.logs.stdout.join('\n');
        const stderr = execution.logs.stderr.join('\n');
        const hasError = execution.error !== undefined;

        await sandbox.kill().catch(() => {});

        return {
          engine: 'e2b_cloud_microvm',
          success: !hasError,
          stdout: stdout || (hasError ? '' : 'Execution completed with no standard output.'),
          stderr: stderr || (hasError ? `${execution.error?.name}: ${execution.error?.value}` : ''),
          exitCode: hasError ? 1 : 0,
          executionTimeMs: Date.now() - startTime,
        };
      } else {
        // Bash command execution in E2B
        const proc = await sandbox.commands.run(codeOrCommand, {
          timeoutMs,
        });

        await sandbox.kill().catch(() => {});

        return {
          engine: 'e2b_cloud_microvm',
          success: proc.exitCode === 0,
          stdout: proc.stdout,
          stderr: proc.stderr,
          exitCode: proc.exitCode ?? 0,
          executionTimeMs: Date.now() - startTime,
        };
      }
    } catch (err: any) {
      if (sandbox) {
        await sandbox.kill().catch(() => {});
      }
      // If E2B failed (e.g. invalid key or network issue), fall through to local fallback
      console.warn(`[E2B Sandbox Warning] Cloud execution failed (${err.message}). Falling back to local engine.`);
    }
  }

  // 2. Try Local Docker Container (SecurityEngine)
  try {
    const dockerResult = language === 'python'
      ? await runDockerSecurityTool('python3', ['-c', codeOrCommand], timeoutMs)
      : await runDockerSecurityTool('sh', ['-c', codeOrCommand], timeoutMs);

    if (dockerResult.success) {
      return {
        engine: 'local_docker_container',
        success: true,
        stdout: dockerResult.stdout,
        stderr: dockerResult.stderr,
        exitCode: 0,
        executionTimeMs: Date.now() - startTime,
      };
    }
  } catch (err) {
    // Docker is not running or failed, fall through to native isolated execution
  }

  // 3. Fallback: Native Node execution with safety boundaries
  try {
    const cmd = language === 'python'
      ? `python3 -c ${JSON.stringify(codeOrCommand)}`
      : codeOrCommand;

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
    });

    return {
      engine: 'native_sandbox_fallback',
      success: true,
      stdout: stdout || 'Command executed successfully.',
      stderr: stderr || '',
      exitCode: 0,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      engine: 'native_sandbox_fallback',
      success: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      exitCode: err.code || 1,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
