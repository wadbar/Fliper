
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./Logger";

/**
 * INDUSTRIAL CLOUD STORAGE PROVIDER (S3 Compatible)
 * Manages remote asset synchronization for FliperOS.
 */
export class CloudStorageProvider {
  private static client: S3Client | null = null;
  private static bucket = process.env.S3_BUCKET || "fliperos-assets";

  private static getClient() {
    if (!this.client) {
      this.client = new S3Client({
        region: process.env.S3_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || "",
          secretAccessKey: process.env.S3_SECRET_KEY || "",
        },
        endpoint: process.env.S3_ENDPOINT, // For Minio/DigitalOcean/Cloudflare
      });
    }
    return this.client;
  }

  public static async uploadFile(key: string, body: Buffer | string, contentType?: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      await this.getClient().send(command);
      logger.info(`CloudStorage: Upload successful [${key}]`);
    } catch (e: any) {
      logger.error(`CloudStorage: Upload error [${key}]`, e.message);
      throw e;
    }
  }

  public static async listFiles(prefix: string = "") {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });
      const response = await this.getClient().send(command);
      return response.Contents?.map(item => ({
        name: item.Key,
        size: item.Size,
        lastModified: item.LastModified
      })) || [];
    } catch (e: any) {
      logger.error("CloudStorage: List error", e.message);
      return [];
    }
  }

  public static async getDownloadUrl(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.getClient(), command, { expiresIn: 3600 });
    } catch (e: any) {
      logger.error(`CloudStorage: Presigned URL error [${key}]`, e.message);
      return null;
    }
  }

  public static async deleteFile(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.getClient().send(command);
      logger.info(`CloudStorage: Deleted [${key}]`);
    } catch (e: any) {
      logger.error(`CloudStorage: Delete error [${key}]`, e.message);
      throw e;
    }
  }
}
