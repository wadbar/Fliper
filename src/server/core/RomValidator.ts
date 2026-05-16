
import crypto from "crypto";
import fs from "fs";
import { logger } from "./Logger";

/**
 * ROM VALIDATOR SERVICE
 * Handles cryptographic integrity checks against No-Intro/Redump style databases.
 */
export class RomValidator {
  // Mock Database of known good hashes (In production, this would be a SQLite/JSON DB)
  private static readonly HASH_DB: Record<string, { md5: string, status: string }> = {
    "Super Mario World (USA)": { md5: "713c5787caac00f2e82f7678e7c1f85d", status: "Verified" },
    "The Legend of Zelda: A Link to the Past": { md5: "d6daaeedefa9750044552bcbbfe8ed5d", status: "Verified" },
    "Sonic the Hedgehog (USA, Europe)": { md5: "f83375b486f0c4309a27c0065D39943F", status: "Verified" }
  };

  /**
   * Calculates hash of a local file
   */
  public static async calculateHash(filePath: string, algorithm: 'md5' | 'sha1' = 'md5'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Validates a ROM against the internal database
   */
  public static async validate(title: string, filePath: string): Promise<{ valid: boolean, foundHash: string, expectedHash?: string }> {
    try {
      const actualHash = await this.calculateHash(filePath, 'md5');
      const record = this.HASH_DB[title];
      
      if (!record) {
        return { valid: false, foundHash: actualHash };
      }

      const isValid = actualHash === record.md5;
      return { 
        valid: isValid, 
        foundHash: actualHash, 
        expectedHash: record.md5 
      };
    } catch (error) {
      logger.error("Validation failed", error);
      throw error;
    }
  }
}
