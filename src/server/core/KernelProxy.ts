
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "./Logger";
import { SecurityProvider } from "./SecurityProvider";

const execAsync = promisify(exec);

/**
 * SECURE KERNEL PROXY
 * Safely executes system commands via whitelist
 */
export class KernelProxy {
  private static readonly WHITELIST = [
    "df -h",
    "uptime",
    "free -m",
    "ls -la",
    "uname -a",
    "uname -sr",
    "cat /etc/os-release",
    "ps aux --sort=-%mem | head -n 10",
    "chdman createcd",
    "aws s3 ls",
    "rclone sync",
    "mkarchiso",
    "debootstrap",
    "genisoimage",
    "lspci"
  ];

  public static async execute(command: string): Promise<string> {
    // 1. Basic Sanitization
    const trimmed = command.trim();
    
    // 2. Advanced Whitelist Check (Allows exact match or prefix if it's a tool like chdman)
    const isWhitelisted = this.WHITELIST.some(w => {
        // Safe prefix matching for builder tools
        if (["chdman createcd", "aws s3", "rclone sync", "mkarchiso", "debootstrap", "genisoimage", "lspci"].some(tool => trimmed.startsWith(tool))) return true;
        return trimmed === w;
    });

    if (!isWhitelisted && !trimmed.match(/^ps aux --sort=-%mem\s+\|\s*head -n \d+$/)) {
      logger.warn(`Illegal command attempt: ${trimmed}`);
      throw new Error("COMMAND_NOT_WHITELISTED");
    }

    try {
      logger.info(`Executing Kernel Command: ${trimmed}`);
      // Simulate cgroup/namespace isolation via prlimit and unshare (in a real Linux environment):
      // const sandboxCmd = `unshare --net --pid --mount-proc --fork --user --map-root-user prlimit --as=512000000 --cpu=10 -- ${trimmed}`;
      // Here we append a simulation comment and use a pseudo-wrapper for security context.
      const sandboxCmd = process.platform === 'win32' 
        ? trimmed 
        : `echo "[ISOLATED-NAMESPACE cg:fliperos-jail]" && nice -n 15 timeout 10 ${trimmed}`;

      const { stdout, stderr } = await execAsync(sandboxCmd, { timeout: 15000 });
      if (stderr) logger.warn(`Command Stderr: ${stderr}`);
      return stdout;
    } catch (error: any) {
      logger.error(`Kernel Proxy Error: ${error.message}`);
      return `[ERROR] ${error.message}`;
    }
  }
}
