import crypto from "node:crypto";
import { logger } from "./Logger";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * KEY MANAGER (Industrial Security Chain)
 * Generates and manages ECDSA keys for signing and verifying payload artifacts.
 */
export class KeyManager {
    private static keyCache: { privateKey?: crypto.KeyObject; publicKey?: crypto.KeyObject } = {};

    private static async loadOrGenerateKeys(): Promise<void> {
        if (this.keyCache.privateKey && this.keyCache.publicKey) return;

        const keyPath = path.join(process.cwd(), '.sys_keys');
        const privPath = path.join(keyPath, 'sys_private.pem');
        const pubPath = path.join(keyPath, 'sys_public.pem');

        try {
            await fs.mkdir(keyPath, { recursive: true });
            
            try {
                const privPem = await fs.readFile(privPath, 'utf8');
                const pubPem = await fs.readFile(pubPath, 'utf8');
                
                this.keyCache.privateKey = crypto.createPrivateKey(privPem);
                this.keyCache.publicKey = crypto.createPublicKey(pubPem);
            } catch (err) {
                logger.info("[SECURITY] Generating new ECDSA key pair for system integrity...");
                const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
                    namedCurve: 'secp256k1'
                });
                
                await fs.writeFile(privPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
                await fs.writeFile(pubPath, publicKey.export({ type: 'spki', format: 'pem' }));
                
                this.keyCache.privateKey = privateKey;
                this.keyCache.publicKey = publicKey;
                logger.info("[SECURITY] Key pair generated and secured.");
            }
        } catch (e: any) {
            logger.error(`[SECURITY_FAULT] Failed to manage cryptographic keys: ${e.message}`);
            throw e;
        }
    }

    public static async signBuild(data: Buffer): Promise<string> {
        logger.info("[SECURITY] Generating cryptographic ECDSA signature for artifact...");
        await this.loadOrGenerateKeys();
        
        if (!this.keyCache.privateKey) throw new Error("Private key unavailable");
        
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        sign.end();
        
        const signature = sign.sign(this.keyCache.privateKey).toString('hex');
        return signature;
    }

    public static async verifySignature(data: Buffer, signature: string): Promise<boolean> {
        await this.loadOrGenerateKeys();
        
        if (!this.keyCache.publicKey) throw new Error("Public key unavailable");
        
        const verify = crypto.createVerify('SHA256');
        verify.update(data);
        verify.end();
        
        return verify.verify(this.keyCache.publicKey, Buffer.from(signature, 'hex'));
    }
}
