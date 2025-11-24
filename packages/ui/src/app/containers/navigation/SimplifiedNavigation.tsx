import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Text,
    Heading,
    Button,
    VStack,
    HStack,
    Flex,
    IconButton,
    useColorModeValue,
    Badge,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
} from '@chakra-ui/react';
import { FiRefreshCw, FiServer, FiMoreVertical, FiRotateCcw } from 'react-icons/fi';
import { AiOutlineClear } from 'react-icons/ai';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { resetApp } from '../../actions/GeneralActions';
import { clear as clearLogs } from '../../slices/LogsSlice';
import { getConfig } from '../../utils/IpcUtils';
import { ConfirmationDialog } from '../../components/modals/ConfirmationDialog';

export const SimplifiedNavigation = (): JSX.Element => {
    const dispatch = useAppDispatch();
    const [isConnected, setIsConnected] = useState(false);
    const [lastSync, setLastSync] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const resetDialogRef = useRef<HTMLButtonElement>(null);

    // Get real logs from Redux store
    const logs = useAppSelector(state => state.logStore.logs);

    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const cardBg = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.800', 'gray.200');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

    // Filter logs to show only delivered, received, and heartbeat logs
    const filteredLogs = logs.filter(log => {
        const message = log.message.toLowerCase();
        // Check for inbound messages - matches "New Message from +" followed by any phone number
        const isInboundMessage = message.includes('new message from +');
        const isOutboundMessage = message.includes('delivered message from [you]:');
        console.log("LOG:", message, isInboundMessage, isOutboundMessage);
        return isOutboundMessage || 
               isInboundMessage;
    });

    // Check if server is properly configured
    useEffect(() => {
        const checkServerConfig = async () => {
            setIsLoading(true);
            try {
                const config = await getConfig();
                // Server is configured if tutorial is done and we have server_id and server_address
                const isConfigured = config.tutorial_is_done === true && 
                                    config.server_id && 
                                    config.server_address;
                
                setIsConnected(isConfigured);
                if (isConfigured) {
                    setLastSync(new Date().toLocaleTimeString());
                }
            } catch (error) {
                console.error('Failed to check server config:', error);
                setIsConnected(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkServerConfig();
    }, []);

    const handleResetClick = () => {
        setShowResetDialog(true);
    };

    const handleResetConfirm = () => {
        resetApp();
        setShowResetDialog(false);
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            const config = await getConfig();
            const isConfigured = config.tutorial_is_done === true && 
                                config.server_id && 
                                config.server_address;
            
            setIsConnected(isConfigured);
            if (isConfigured) {
                setLastSync(new Date().toLocaleTimeString());
            }
        } catch (error) {
            console.error('Failed to refresh server config:', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearLogs = () => {
        dispatch(clearLogs());
    };

    return (
        <Box
            minH="100vh"
            bg={bgColor}
            p={8}
        >
            <VStack spacing={8} maxW="1200px" mx="auto">
                {/* Header */}
                <Flex w="100%" justifyContent="space-between" alignItems="center">
                    <HStack spacing={4}>
                        {/* <Box
                            w="60px"
                            h="60px"
                            borderRadius="full"
                            bg="blue.500"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color="white"
                            fontSize="2xl"
                        >
                            💬
                        </Box> */}
                        <VStack align="start" spacing={1}>
                            <Heading size="xl" color={textColor}>
                                Markso Relay
                            </Heading>
                            <Text fontSize="sm" color="gray.500">
                                v1.0.0
                            </Text>
                        </VStack>
                    </HStack>

                    <Button
                        leftIcon={<FiRotateCcw />}
                        colorScheme="red"
                        variant="outline"
                        onClick={handleResetClick}
                    >
                        Reset
                    </Button>
                </Flex>

                {/* Status Section */}
                <Box
                    w="100%"
                    bg={cardBg}
                    borderRadius="xl"
                    p={6}
                    border="1px solid"
                    borderColor={borderColor}
                    boxShadow="lg"
                >
                    <HStack spacing={8} align="start">
                        {/* Server Status */}
                        <VStack align="start" spacing={4} flex={1}>
                            <HStack spacing={3}>
                                <FiServer size={24} color={isConnected ? '#38A169' : '#E53E3E'} />
                                <VStack align="start" spacing={1}>
                                    <Text
                                        fontSize="lg"
                                        fontWeight="bold"
                                        color={isConnected ? 'green.500' : 'red.500'}
                                    >
                                        {isConnected ? 'Connected to Server' : 'Disconnected'}
                                    </Text>
                                </VStack>
                            </HStack>

                            <VStack align="start" spacing={1} fontSize="sm" color="gray.600">
                                <Text>Last sync: {lastSync || 'Never'}</Text>
                                <Text>Local Fetched: {lastSync || 'Never'}</Text>
                            </VStack>
                        </VStack>

                        {/* Controls */}
                        <VStack spacing={4} align="end">
                            <IconButton
                                aria-label="Refresh"
                                icon={<FiRefreshCw />}
                                onClick={handleRefresh}
                                isLoading={isLoading}
                                variant="outline"
                            />
                        </VStack>
                    </HStack>
                </Box>

                {/* Activity Log */}
                <Box
                    w="100%"
                    bg={cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={borderColor}
                    boxShadow="lg"
                >
                    <Flex
                        p={4}
                        borderBottom="1px solid"
                        borderBottomColor={borderColor}
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Heading size="md" color={textColor}>
                            Message Activity Log
                        </Heading>
                        <HStack spacing={2}>
                            <Menu>
                                <MenuButton
                                    as={IconButton}
                                    aria-label="Log options"
                                    icon={<FiMoreVertical />}
                                    variant="ghost"
                                    size="sm"
                                />
                                <MenuList>
                                    <MenuItem icon={<AiOutlineClear />} onClick={handleClearLogs}>
                                        Clear Logs
                                    </MenuItem>
                                    <MenuItem icon={<FiRefreshCw />} onClick={handleRefresh}>
                                        Refresh
                                    </MenuItem>
                                </MenuList>
                            </Menu>
                        </HStack>
                    </Flex>

                    <Box
                        h="400px"
                        overflowY="auto"
                        p={4}
                    >
                        {filteredLogs.length === 0 ? (
                            <Text color="gray.500" textAlign="center" py={8}>
                                No message activity yet
                            </Text>
                        ) : (
                            <VStack spacing={3} align="stretch">
                                {filteredLogs.slice(-20).reverse().map((log, index) => (
                                    <HStack
                                        key={`${log.id}-${index}`}
                                        p={3}
                                        bg={useColorModeValue('gray.50', 'gray.700')}
                                        borderRadius="md"
                                        spacing={3}
                                    >
                                        <Text fontSize="sm" color="gray.500" minW="80px">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </Text>
                                        <Badge
                                            colorScheme={
                                                log.type === 'error' ? 'red' : 
                                                    log.type === 'warn' ? 'yellow' : 
                                                        log.type === 'debug' ? 'purple' : 'green'
                                            }
                                            variant="solid"
                                            size="sm"
                                        >
                                            {log.type === 'error' ? '✗' : '✓'}
                                        </Badge>
                                        <Text fontSize="sm" color={textColor} flex={1}>
                                            {log.message}
                                        </Text>
                                        <Badge
                                            colorScheme={
                                                log.type === 'error' ? 'red' : 
                                                    log.type === 'warn' ? 'yellow' : 
                                                        log.type === 'debug' ? 'purple' : 'blue'
                                            }
                                            variant="outline"
                                            size="sm"
                                        >
                                            {log.type}
                                        </Badge>
                                    </HStack>
                                ))}
                            </VStack>
                        )}
                    </Box>
                </Box>

                {/* Footer */}
                <HStack spacing={4} color="gray.500" fontSize="sm">
                    <Text>© 2025 Markso Relay. All rights reserved.</Text>
                </HStack>
            </VStack>

            {/* Reset Confirmation Dialog */}
            <ConfirmationDialog
                modalRef={resetDialogRef}
                title="Reset Relay Server"
                body={
                    'Are you sure you want to reset your relay server?<br /><br />' +
                    'This will remove all your configurations & settings. It ' +
                    'will also restart the app when complete.'
                }
                declineText="Cancel"
                acceptText="Reset"
                isOpen={showResetDialog}
                onClose={() => setShowResetDialog(false)}
                onAccept={handleResetConfirm}
            />
        </Box>
    );
};
