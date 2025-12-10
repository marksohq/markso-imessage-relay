import React, { useState } from 'react';
import {
    Box,
    Text,
    Heading,
    Button,
    Checkbox,
    VStack,
    useColorModeValue,
    Alert,
    AlertIcon
} from '@chakra-ui/react';

interface TermsScreenProps {
    onAccept: () => void;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({ onAccept }) => {
    const [isAccepted, setIsAccepted] = useState(false);
    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const textColor = useColorModeValue('gray.800', 'gray.200');

    const termsText = `
MARKSO NURTURE SERVICE TERMS OF SERVICE

1. ACCEPTANCE OF TERMS
By using this iMessage relay service, you agree to be bound by these Terms of Service.

2. SERVICE DESCRIPTION
This service allows you to relay iMessage communications through a Mac device. The service is provided "as is" without warranties of any kind.

3. USER RESPONSIBILITIES
- You are responsible for ensuring compliance with Apple's Terms of Service
- You must not use the service for spam, harassment, or illegal activities
- You are responsible for maintaining the security of your API key
- Sending messages to more than 50 unique recipients in a short period increases the risk of your Apple ID being temporarily or permanently blocked by Apple

4. LIMITATIONS AND RISKS
- This service takes no responsibility for any account restrictions, bans, or penalties incurred due to policy violations or abuse of Apple's messaging services
- Users are strictly responsible for ensuring compliance with Apple's Terms of Service and any applicable communication regulations
- The service may be subject to Apple's policies and restrictions

5. PRIVACY AND DATA
- Your messages are stored and processedon Markso's servers
- API keys are used for authentication only

6. SERVICE AVAILABILITY
- The service is provided on a best-effort basis
- We do not guarantee uninterrupted service
- The service may be discontinued at any time

7. LIMITATION OF LIABILITY
To the maximum extent permitted by law, the service provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages.

8. CHANGES TO TERMS
We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of any changes.

9. TERMINATION
We may terminate your access to the service at any time for violation of these terms.

10. GOVERNING LAW
These terms are governed by the laws of the jurisdiction in which the service provider operates.
    `;

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
            <VStack spacing={6} maxW="800px" w="100%">
                <Heading size="2xl" textAlign="center" color={textColor}>
                    Welcome to Markso Nurture
                </Heading>
                
                <Text fontSize="lg" textAlign="center" color={textColor}>
                    Please read and accept the agreement to continue
                </Text>

                <Box
                    w="100%"
                    maxH="400px"
                    border="1px solid"
                    borderColor={useColorModeValue('gray.200', 'gray.600')}
                    borderRadius="md"
                    p={4}
                    bg={useColorModeValue('white', 'gray.800')}
                >
                    <Box maxH="350px" overflowY="auto">
                        <Text
                            fontSize="sm"
                            color={textColor}
                            whiteSpace="pre-wrap"
                            fontFamily="mono"
                        >
                            {termsText}
                        </Text>
                    </Box>
                </Box>

                <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                        Sending messages to more than 50 unique recipients in a short period increases the risk of your Apple ID being temporarily or permanently blocked by Apple.
                    </Text>
                </Alert>

                <VStack spacing={4} w="100%">
                    <Checkbox
                        isChecked={isAccepted}
                        onChange={(e) => setIsAccepted(e.target.checked)}
                        colorScheme="blue"
                        size="lg"
                    >
                        <Text color={textColor}>
                            I have read and agree to the terms
                        </Text>
                    </Checkbox>

                    <Button
                        colorScheme="blue"
                        size="lg"
                        onClick={onAccept}
                        isDisabled={!isAccepted}
                        w="200px"
                    >
                        Accept
                    </Button>
                </VStack>
            </VStack>
        </Box>
    );
};
