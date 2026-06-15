import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Derive a 32-byte key from the JWT secret for AES-256
const SECRET_KEY = crypto.scryptSync(process.env.JWT_ACCESS_SECRET || 'default-secret-key-fallback', 'salt', 32);

export function encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
    if (!text) return text;
    // Fallback for old plain-text passwords that aren't encrypted yet
    if (!text.includes(':')) return text; 
    
    try {
        const [ivHex, encryptedHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('[Crypto] Failed to decrypt string:', error);
        return text; // return original if decryption fails
    }
}
