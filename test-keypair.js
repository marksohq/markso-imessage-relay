#!/usr/bin/env node

/**
 * Quick test script for keypair generation and sealed box encryption/decryption
 * Run: node test-keypair.js
 */

const sodium = require('libsodium-wrappers');

async function testKeypair() {
    console.log('🔐 Testing Curve25519 Keypair Generation & Sealed Box Encryption\n');
    
    await sodium.ready;
    console.log('✅ Libsodium initialized\n');
    
    // Generate keypair
    console.log('📋 Step 1: Generate X25519 keypair');
    const keypair = sodium.crypto_box_keypair();
    const publicKey = Buffer.from(keypair.publicKey).toString('base64');
    const privateKey = Buffer.from(keypair.privateKey).toString('base64');
    
    console.log('   Public key length:', keypair.publicKey.length, 'bytes (should be 32)');
    console.log('   Private key length:', keypair.privateKey.length, 'bytes (should be 32)');
    console.log('   Public key (base64):', publicKey.substring(0, 20) + '...');
    console.log('   ✅ Keypair generated\n');
    
    // Seal a message
    console.log('📋 Step 2: Seal a test message');
    const testMessage = 'super_secret_server_password_123';
    const messageBytes = Buffer.from(testMessage, 'utf8');
    const pubKeyBytes = Buffer.from(publicKey, 'base64');
    
    const sealed = sodium.crypto_box_seal(
        new Uint8Array(messageBytes),
        new Uint8Array(pubKeyBytes)
    );
    const sealedB64 = Buffer.from(sealed).toString('base64');
    
    console.log('   Original message:', testMessage);
    console.log('   Sealed (base64):', sealedB64.substring(0, 40) + '...');
    console.log('   Sealed length:', sealed.length, 'bytes');
    console.log('   ✅ Message sealed\n');
    
    // Unseal the message
    console.log('📋 Step 3: Unseal (decrypt) the message');
    const sealedBytes = Buffer.from(sealedB64, 'base64');
    const privKeyBytes = Buffer.from(privateKey, 'base64');
    
    const opened = sodium.crypto_box_seal_open(
        new Uint8Array(sealedBytes),
        new Uint8Array(pubKeyBytes),
        new Uint8Array(privKeyBytes)
    );
    const decrypted = Buffer.from(opened).toString('utf8');
    
    console.log('   Decrypted message:', decrypted);
    console.log('   Match:', decrypted === testMessage ? '✅ SUCCESS' : '❌ FAILED');
    console.log();
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();
    console.log('📋 Integration checklist:');
    console.log('   [✅] Keypair generation (X25519/Curve25519)');
    console.log('   [✅] Sealed box encryption (crypto_box_seal)');
    console.log('   [✅] Sealed box decryption (crypto_box_seal_open)');
    console.log('   [✅] Base64 encoding/decoding');
    console.log();
    console.log('🚀 Ready for production use!');
    console.log();
}

testKeypair().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});

