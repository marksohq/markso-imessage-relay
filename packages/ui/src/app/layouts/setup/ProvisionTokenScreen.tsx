import React, { useState } from 'react';
import {
    Box,
    Text,
    Heading,
    Input,
    Button,
    VStack,
    useColorModeValue,
    Alert,
    AlertIcon,
    Spinner,
    HStack,
    IconButton,
    InputGroup,
    InputRightElement
} from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import { ipcRenderer } from 'electron';

interface ProvisionTokenScreenProps {
    onConnect: (serverConfig: {
        host: string;
        password: string;
        webhookEndpoint?: string;
        userEmail: string;
    }) => void;
    onBack: () => void;
}

export const ProvisionTokenScreen: React.FC<ProvisionTokenScreenProps> = ({ onConnect, onBack }) => {
    const [provisionToken, setProvisionToken] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState('');
    const [showProvisionToken, setShowProvisionToken] = useState(false);
    
    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const cardBg = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.800', 'gray.200');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    const handleConnectSecure = async () => {
        if (!provisionToken.trim()) {
            setError('Please enter your provision token');
            return;
        }

        setIsConnecting(true);
        setError('');

        try {
            // 1. Generate keypair (or retrieve existing)
            const keypairResult = await ipcRenderer.invoke('keypair-generate');
            if (!keypairResult.success) {
                throw new Error(keypairResult.error || 'Failed to generate keypair');
            }
            
            const { publicKey } = keypairResult.generateKeypair;
            const { deviceId, isNew } = keypairResult;
            const deviceName = `Mac-${deviceId.substring(0, 8)}`;
            
            console.log('🔑 Keypair ready for device:', deviceName);
            console.log('   Device ID:', deviceId);
            console.log('   Public key:', publicKey);
            console.log('   Is new:', isNew);

            // 2. Call exchange
            console.log('🌐 Exchanging token with server...');
            const exchangeResponse = await ipcRenderer.invoke('exchange-provision-token', {
                url: 'https://usable-uniquely-kit.ngrok-free.app/api/provision/exchange',
                token: provisionToken,
                pubkey_b64: publicKey,
                device_name: deviceName,
                device_id: deviceId
            });

            if (!exchangeResponse.success) {
                console.error('❌ Exchange failed:', exchangeResponse.status, exchangeResponse.data);
                throw new Error(exchangeResponse.error || 'Token exchange failed');
            }

            const configData = exchangeResponse.data;
            console.log('✅ EXCHANGE DATA:', configData);
            
            // 3. Decrypt password, tunnel token, and webhook secret
            console.log('🔓 Decrypting sealed secrets...');
            
            const decryptPasswordResult = await ipcRenderer.invoke('keypair-decrypt-sealed', {
                sealedB64: configData.sealed_password_b64
            });
            if (!decryptPasswordResult.success) {
                throw new Error('Failed to decrypt server password');
            }
            const serverPassword = decryptPasswordResult.plaintext;
            console.log('✅ Server password decrypted successfully');

            const decryptTunnelTokenResult = await ipcRenderer.invoke('keypair-decrypt-sealed', {
                sealedB64: configData.sealed_tunnel_token_b64
            });
            if (!decryptTunnelTokenResult.success) {
                throw new Error('Failed to decrypt tunnel token');
            }
            const tunnelToken = decryptTunnelTokenResult.plaintext;
            console.log('✅ Tunnel token decrypted successfully');

            const decryptWebhookSecretResult = await ipcRenderer.invoke('keypair-decrypt-sealed', {
                sealedB64: configData.sealed_webhook_secret_b64
            });
            if (!decryptWebhookSecretResult.success) {
                throw new Error('Failed to decrypt webhook secret');
            }
            const webhookSecret = decryptWebhookSecretResult.plaintext;
            console.log('✅ Webhook secret decrypted successfully');
            
            // 4. Install cloudflared with tunnel token
            console.log('🚇 Installing cloudflared tunnel service...');
            setError('Installing cloudflared tunnel... (admin password required)');
            
            let installResult = await ipcRenderer.invoke('install-cloudflared-service', {
                tunnelToken
            });
            
            // Handle admin password cancellation
            while (!installResult.success && installResult.cancelled) {
                console.log('⚠️  User cancelled admin prompt, asking to retry...');
                setError('Admin password required. Click "Connect" to retry.');
                setIsConnecting(false);
                
                await new Promise(resolve => {
                    const retryButton = document.querySelector('button[type="submit"]');
                    if (retryButton) {
                        retryButton.addEventListener('click', resolve, { once: true });
                    } else {
                        setTimeout(resolve, 1000);
                    }
                });
                
                setIsConnecting(true);
                setError('Installing cloudflared tunnel... (admin password required)');
                
                installResult = await ipcRenderer.invoke('install-cloudflared-service', {
                    tunnelToken
                });
            }
            
            if (!installResult.success) {
                console.error('❌ Cloudflared installation failed:', installResult.error);
                throw new Error(`Failed to install cloudflared: ${installResult.error}`);
            }
            
            console.log('✅ Cloudflared service installed successfully');
            setError(''); // Clear error message
            
            // 5. Store sensitive information in Keychain
            console.log('🔐 Storing sensitive data in Keychain...');
            
            const storePasswordResult = await ipcRenderer.invoke('store-server-password', {
                password: serverPassword
            });
            if (!storePasswordResult.success) {
                throw new Error('Failed to store server password in Keychain');
            }
            console.log('✅ Server password stored in Keychain');

            const storeWebhookResult = await ipcRenderer.invoke('store-webhook-secret', {
                secret: webhookSecret
            });
            if (!storeWebhookResult.success) {
                throw new Error('Failed to store webhook secret in Keychain');
            }
            console.log('✅ Webhook secret stored in Keychain');
            
            // 6. Set necessary configs
            console.log('💾 Saving configuration to database...');
            
            // Ensure host has https:// prefix for Cloudflare Tunnel
            let serverAddress = configData.host;
            if (!serverAddress.startsWith('http://') && !serverAddress.startsWith('https://')) {
                serverAddress = `https://${serverAddress}`;
            }

            const confirmResponse = await ipcRenderer.invoke('register-server-device', {
                url: `https://usable-uniquely-kit.ngrok-free.app/api/provision/register`,
                serverPassword: serverPassword,
                pubkey_b64: publicKey,
                device_id: deviceId,
                relay_id: configData.server_id // Include server/relay ID
            });
            
            if (!confirmResponse.success) {
                console.warn('⚠️  Failed to confirm setup with server:', confirmResponse.error);
                // Don't throw error - setup is still successful locally
            } else {
                console.log('✅ Setup confirmed with server');
            }            
            
            // 7. Register webhook
            // const webhookUrl = `https://usable-uniquely-kit.ngrok-free.app/api/webhook/relay?webhook_id=${configData.webhook_id}`;
            const webhookUrl = `https://usable-uniquely-kit.ngrok-free.app/api/webhook/relay/${configData.webhook_id}`;
            console.log('🔗 Webhook URL:', webhookUrl);
            
            try {
                const webhookResponse = await ipcRenderer.invoke('create-webhook', {
                    url: webhookUrl,
                    events: [{ label: 'All Events', value: '*' }]
                });
                console.log('✅ WEBHOOK RESPONSE:', webhookResponse);
                console.log('✅ Webhook registered successfully');
            } catch (error) {
                console.warn('⚠️  Failed to register webhook:', error);
                // Don't throw error - setup is still successful locally
            }

            await ipcRenderer.invoke('set-config', {
                server_id: configData.server_id,
                server_address: serverAddress,
                webhook_id: configData.webhook_id,
                tutorial_is_done: true,
                auto_caffeinate: true,
                auto_start: true,
                enable_private_api: true,
                proxy_service: 'dynamic-dns',
                open_findmy_on_startup: false,
                password_stored_in_keychain: true,
                webhook_secret_stored_in_keychain: true
            });
            
            const newConfig = await ipcRenderer.invoke('get-config');
            console.log('✅ NEW CONFIG:', newConfig);
            
            // 8. Send confirmation to server
            console.log('📡 Sending setup confirmation to server...');

            
            console.log('✅ Configuration saved successfully');
            console.log('   Server:', configData.host);
            console.log('   Device ID:', deviceId);
            console.log('   Webhook ID:', configData.webhook_id);
            
            // Call onConnect to proceed to main app
            onConnect({
                host: configData.host,
                password: serverPassword,
                webhookEndpoint: webhookUrl,
                userEmail: configData.user_email || 'user@example.com'
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setIsConnecting(false);
        }
    }

    const handleConnect = async () => {
        // Call the new secure function
        await handleConnectSecure();
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setProvisionToken(text);
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };

    return (
        <Box
            height="100vh"
            bg={bgColor}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            p={8}
        >
            <VStack spacing={8} maxW="500px" w="100%">
                {/* Logo/Icon */}
                <Box
                    w="80px"
                    h="80px"
                    borderRadius="full"
                    bg="blue.500"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontSize="2xl"
                >
                    💬
                </Box>

                {/* Welcome Card */}
                <Box
                    w="100%"
                    bg={cardBg}
                    borderRadius="xl"
                    p={8}
                    boxShadow="lg"
                    border="1px solid"
                    borderColor={borderColor}
                >
                    <VStack spacing={6}>
                        <Heading size="xl" textAlign="center" color={textColor}>
                            Welcome Back
                        </Heading>
                        
                        <Text fontSize="lg" textAlign="center" color="gray.600">
                            Login With Provision Token
                        </Text>

                        <VStack spacing={4} w="100%">
                            <Text fontSize="sm" color="gray.600" textAlign="center">
                                Enter your provision token to connect to the iMessage relay service
                            </Text>

                            <InputGroup>
                                <Input
                                    // type={showProvisionToken ? 'text' : 'password'}
                                    type="text"
                                    placeholder="Enter your provision token"
                                    value={provisionToken}
                                    onChange={(e) => setProvisionToken(e.target.value)}
                                    size="lg"
                                    borderRadius="md"
                                />
                                <InputRightElement>
                                    <HStack spacing={2}>
                                        {/* <IconButton
                                            aria-label="Toggle password visibility"
                                            icon={showPassword ? <FiEyeOff /> : <FiEye />}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPassword(!showPassword)}
                                        /> */}
                                        <IconButton
                                            aria-label="Paste from clipboard"
                                            icon={<FiCopy />}
                                            variant="ghost"
                                            size="sm"
                                            onClick={handlePaste}
                                        />
                                    </HStack>
                                </InputRightElement>
                            </InputGroup>

                            {error && (
                                <Alert status="error" borderRadius="md">
                                    <AlertIcon />
                                    <Text fontSize="sm">{error}</Text>
                                </Alert>
                            )}

                            <HStack spacing={4} w="100%">
                                <Button
                                    variant="outline"
                                    onClick={onBack}
                                    flex={1}
                                    isDisabled={isConnecting}
                                >
                                    Back
                                </Button>
                                
                                <Button
                                    colorScheme="blue"
                                    onClick={handleConnect}
                                    flex={1}
                                    isLoading={isConnecting}
                                    loadingText="Connecting..."
                                    isDisabled={!provisionToken.trim() || isConnecting}
                                >
                                    {isConnecting ? (
                                        <HStack>
                                            <Spinner size="sm" />
                                            <Text>Connecting...</Text>
                                        </HStack>
                                    ) : (
                                        'Connect'
                                    )}
                                </Button>
                            </HStack>
                        </VStack>
                    </VStack>
                </Box>

                {/* Help Text */}
                <Text fontSize="sm" color="gray.500" textAlign="center">
                    Don't have a provision token? Get one from your dashboard.
                </Text>
            </VStack>
        </Box>
    );
};
