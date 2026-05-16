
import path from "path";
import { logger } from "./Logger";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  KERNEL_SPACE = 'KERNEL_SPACE'
}

/**
 * PATH SANITIZATION & IPC SECURITY
 */
export class SecurityProvider {
  private static readonly ALLOWED_BASE_DIR = process.cwd();
  private static readonly JWT_SECRET = crypto.randomBytes(64).toString('hex'); // In-memory random secret

  /**
   * Generates a stateless JWT token
   */
  public static generateToken(userId: string, role: Role): string {
    return jwt.sign({ userId, role }, this.JWT_SECRET, { expiresIn: '1h' });
  }

  /**
   * RBAC Middleware
   */
  public static requireRole(requiredRole: Role) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new Error("Missing or invalid authorization header");
        }
        
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string, role: Role };

        // Hierarchy logic: KERNEL_SPACE > ADMIN > USER
        const isValid = 
            (requiredRole === Role.USER) ||
            (requiredRole === Role.ADMIN && (decoded.role === Role.ADMIN || decoded.role === Role.KERNEL_SPACE)) ||
            (requiredRole === Role.KERNEL_SPACE && decoded.role === Role.KERNEL_SPACE);

        if (!isValid) {
          throw new Error(`Insufficient privileges. Required: ${requiredRole}, Provided: ${decoded.role}`);
        }

        (req as any).user = decoded;
        next();
      } catch (e: any) {
        logger.warn(`Security Violation: Access denied - ${e.message}`, { ip: req.ip, path: req.path });
        res.status(403).json({ error: "ACCESS_DENIED: Invalid Token or Insufficient Permissions" });
      }
    };
  }

  /**
   * Prevents Directory Traversal Attacks
   */
  public static sanitizePath(input: string): string {
    if (!input || typeof input !== 'string') return "";
    const resolved = path.resolve(input.trim());
    if (!resolved || typeof resolved.startsWith !== 'function') return "";
    
    if (this.ALLOWED_BASE_DIR && !resolved.startsWith(this.ALLOWED_BASE_DIR)) {
      logger.error("Security Violation: Attempted directory traversal detected", { path: input });
      throw new Error("ACCESS_DENIED: Path outside allowed scope");
    }
    return resolved;
  }

  /**
   * Validates if a filename is safe (alphanumeric + basic symbols)
   */
  public static isSafeName(name: string): boolean {
    const safeRegex = /^[a-zA-Z0-9._\-\s()[\]!]+$/;
    return safeRegex.test(name);
  }
}
