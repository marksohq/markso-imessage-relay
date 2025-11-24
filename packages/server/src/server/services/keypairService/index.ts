import sodium from 'libsodium-wrappers';
import keytar from 'keytar';
import { uuidv4 } from '@firebase/util';

/**
 * KeypairService - Handles Curve25519/X25519 keypair generation and management
 * Compatible with crypto_box_seal/crypto_box_seal_open for sealed box encryption
 * Stores private keys securely in macOS Keychain
 */
export class KeypairService {
    private static initialized = false;
    private static readonly DEVICE_SERVICE = 'com.imessagerelay.device';
    private static readonly SERVER_SERVICE = 'com.imessagerelay.server';
    private static readonly ACCOUNT_PRIVATE = 'device_private_key';
    private static readonly ACCOUNT_PUBLIC = 'device_public_key';
    private static readonly ACCOUNT_DEVICE_ID = 'device_id';
    private static readonly ACCOUNT_SERVER_PASSWORD = 'server_password';
    private static readonly ACCOUNT_WEBHOOK_SECRET = 'webhook_secret';

    /**
     * Initialize libsodium (must be called before using any crypto functions)
     */
    public static async initialize(): Promise<void> {
        if (!KeypairService.initialized) {
            await sodium.ready;
            KeypairService.initialized = true;
            console.log('✅ Libsodium initialized');
        }
    }

    /**
     * Ensure keypair exists (generate if first-run, retrieve if exists)
     * Returns the device's keypair and device ID
     */
    public static async ensureKeypair(): Promise<{
        publicKey: string;
        privateKey: string;
        deviceId: string;
        isNew: boolean;
    }> {
        await KeypairService.initialize();

        // Check if keys already exist in Keychain
        const existingPrivate = await keytar.getPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_PRIVATE
        );
        const existingPublic = await keytar.getPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_PUBLIC
        );
        let deviceId = await keytar.getPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_DEVICE_ID
        );

        if (existingPrivate && existingPublic && deviceId) {
            console.log('🔑 Found existing keypair in Keychain');
            console.log('   Device ID:', deviceId);
            return {
                publicKey: existingPublic,
                privateKey: existingPrivate,
                deviceId,
                isNew: false
            };
        }

        // Generate new keypair
        console.log('🔑 Generating new Curve25519 keypair...');
        const keypair = sodium.crypto_box_keypair();

        // Convert to base64 for storage
        const publicKey = Buffer.from(keypair.publicKey).toString('base64');
        const privateKey = Buffer.from(keypair.privateKey).toString('base64');

        // Generate device ID if not exists
        if (!deviceId) {
            deviceId = uuidv4();
        }

        // Store securely in macOS Keychain
        await keytar.setPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_PRIVATE,
            privateKey
        );
        await keytar.setPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_PUBLIC,
            publicKey
        );
        await keytar.setPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_DEVICE_ID,
            deviceId
        );

        console.log('✅ Keypair generated and stored in Keychain');
        console.log('   Public key length:', keypair.publicKey.length, 'bytes (32 = X25519)');
        console.log('   Device ID:', deviceId);
        console.log('   Public key (base64):', publicKey);

        return {
            publicKey,
            privateKey,
            deviceId,
            isNew: true
        };
    }

    /**
     * Generate a Curve25519 keypair (legacy method, prefer ensureKeypair)
     */
    public static async generateKeypair(): Promise<{
        publicKey: string;
        privateKey: string;
    }> {
        const result = await KeypairService.ensureKeypair();
        return {
            publicKey: result.publicKey,
            privateKey: result.privateKey
        };
    }

    /**
     * Get device ID from Keychain
     */
    public static async getDeviceId(): Promise<string | null> {
        return await keytar.getPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_DEVICE_ID
        );
    }

    /**
     * Get public key from Keychain
     */
    public static async getPublicKey(): Promise<string | null> {
        return await keytar.getPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_PUBLIC
        );
    }

    /**
     * Get private key from Keychain
     */
    public static async getPrivateKey(): Promise<string | null> {
        return await keytar.getPassword(
            KeypairService.DEVICE_SERVICE,
            KeypairService.ACCOUNT_PRIVATE
        );
    }

    /**
     * Decrypt a sealed box using the device's private key
     * @param sealedB64 - Base64 encoded sealed box ciphertext
     * @returns Decrypted plaintext or null if decryption fails
     */
    public static async decryptSealedBox(sealedB64: string): Promise<string | null> {
        try {
            await KeypairService.initialize();

            const publicKey = await KeypairService.getPublicKey();
            const privateKey = await KeypairService.getPrivateKey();

            if (!publicKey || !privateKey) {
                console.error('❌ No keypair found in Keychain');
                return null;
            }

            const sealed = Buffer.from(sealedB64, 'base64');
            const pub = Buffer.from(publicKey, 'base64');
            const priv = Buffer.from(privateKey, 'base64');

            const opened = sodium.crypto_box_seal_open(
                new Uint8Array(sealed),
                new Uint8Array(pub),
                new Uint8Array(priv)
            );

            const plaintext = Buffer.from(opened).toString('utf8');
            console.log('✅ Successfully decrypted sealed box');
            return plaintext;
        } catch (error) {
            console.error('❌ Failed to decrypt sealed box:', error);
            return null;
        }
    }

    /**
     * Encrypt a message using sealed box (for testing purposes)
     * @param message - Plaintext message
     * @param publicKeyB64 - Base64 encoded public key (optional, uses device's if not provided)
     * @returns Base64 encoded ciphertext
     */
    public static async encryptSealedBox(
        message: string,
        publicKeyB64?: string
    ): Promise<string> {
        await KeypairService.initialize();

        let publicKey = publicKeyB64;
        if (!publicKey) {
            publicKey = await KeypairService.getPublicKey();
        }

        if (!publicKey) {
            throw new Error('No public key available');
        }

        const pub = Buffer.from(publicKey, 'base64');
        const messageBytes = Buffer.from(message, 'utf8');

        const ciphertext = sodium.crypto_box_seal(
            new Uint8Array(messageBytes),
            new Uint8Array(pub)
        );

        return Buffer.from(ciphertext).toString('base64');
    }

    /**
     * Store server password in Keychain
     */
    public static async storeServerPassword(password: string): Promise<void> {
        await keytar.setPassword(
            KeypairService.SERVER_SERVICE,
            KeypairService.ACCOUNT_SERVER_PASSWORD,
            password
        );
        console.log('✅ Server password stored in Keychain');
    }

    /**
     * Get server password from Keychain
     */
    public static async getServerPassword(): Promise<string | null> {
        return await keytar.getPassword(
            KeypairService.SERVER_SERVICE,
            KeypairService.ACCOUNT_SERVER_PASSWORD
        );
    }

    /**
     * Store webhook secret in Keychain
     */
    public static async storeWebhookSecret(secret: string): Promise<void> {
        await keytar.setPassword(
            KeypairService.SERVER_SERVICE,
            KeypairService.ACCOUNT_WEBHOOK_SECRET,
            secret
        );
        console.log('✅ Webhook secret stored in Keychain');
    }

    /**
     * Get webhook secret from Keychain
     */
    public static async getWebhookSecret(): Promise<string | null> {
        return await keytar.getPassword(
            KeypairService.SERVER_SERVICE,
            KeypairService.ACCOUNT_WEBHOOK_SECRET
        );
    }

    /**
     * Clear server credentials from Keychain (for re-provisioning)
     */
    public static async clearServerCredentials(): Promise<void> {
        console.log('🗑️ Clearing server credentials from Keychain...');
        await keytar.deletePassword(KeypairService.SERVER_SERVICE, KeypairService.ACCOUNT_SERVER_PASSWORD);
        await keytar.deletePassword(KeypairService.SERVER_SERVICE, KeypairService.ACCOUNT_WEBHOOK_SECRET);
        console.log('✅ Server credentials cleared');
    }

    /**
     * Clear all keys from Keychain (for testing/reset)
     */
    public static async clearKeypair(): Promise<void> {
        console.log('🗑️ Clearing keypair from Keychain...');
        await keytar.deletePassword(KeypairService.DEVICE_SERVICE, KeypairService.ACCOUNT_PRIVATE);
        await keytar.deletePassword(KeypairService.DEVICE_SERVICE, KeypairService.ACCOUNT_PUBLIC);
        await keytar.deletePassword(KeypairService.DEVICE_SERVICE, KeypairService.ACCOUNT_DEVICE_ID);
        console.log('✅ Keypair cleared');
    }

    /**
     * Clear all credentials (device + server)
     */
    public static async clearAllCredentials(): Promise<void> {
        await KeypairService.clearKeypair();
        await KeypairService.clearServerCredentials();
        console.log('✅ All credentials cleared');
    }
}
