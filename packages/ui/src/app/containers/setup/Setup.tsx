import React from 'react';
import {
    IconButton,
    Box,
    Flex,
    HStack,
    useColorModeValue,
    Link,
    Text,
    Tooltip,
    Switch,
    FormControl,
    useColorMode,
    Spacer,
    Divider
} from '@chakra-ui/react';
import { FiMessageCircle } from 'react-icons/fi';
import { AiOutlineHome } from 'react-icons/ai';
import { MdOutlineLightMode, MdOutlineDarkMode } from 'react-icons/md';
import { SimplifiedSetup } from '../../layouts/setup/SimplifiedSetup';
import { useAppDispatch } from '../../hooks';
import { toggleTutorialCompleted } from '../../actions/GeneralActions';

export const Setup = (): JSX.Element => {
    const dispatch = useAppDispatch();

    const handleSetupComplete = (apiKey: string) => {
        // TODO: Store API key in Redux store
        console.log('API Key received:', apiKey);
        // TODO: Set up connection to Supabase
        dispatch(toggleTutorialCompleted(true) as any);
    };

    return (
        <Box height="100%">
            <NavBar />
            <SimplifiedSetup onSetupComplete={handleSetupComplete} />
        </Box>
    );
};

const NavBar = (): JSX.Element => {
    const { colorMode, toggleColorMode } = useColorMode();

    return (
        <Flex
            height="20"
            alignItems="center"
            borderBottomWidth="1px"
            borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
            justifyContent='space-between'
            p={4}
            pl={6}
        >
            <Flex alignItems="center" justifyContent='flex-start'>
                <Box
                    w="48px"
                    h="48px"
                    borderRadius="full"
                    bg="blue.500"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontSize="xl"
                >
                    💬
                </Box>
                <Text fontSize="1xl" ml={2}>iMessage Relay</Text>
            </Flex>
            <Flex justifyContent='flex-end'>
                <HStack spacing={{ base: '0', md: '1' }}>
                    <Tooltip label="Help & Support" aria-label="help-tip">
                        <Link href="#" style={{ textDecoration: 'none' }} target="_blank">
                            <IconButton size="lg" variant="ghost" aria-label="help" icon={<AiOutlineHome />} />
                        </Link>
                    </Tooltip>
                    <Tooltip label="Documentation" aria-label="docs-tip">
                        <Link href="#" style={{ textDecoration: 'none' }} target="_blank">
                            <IconButton size="lg" variant="ghost" aria-label="docs" icon={<FiMessageCircle />} />
                        </Link>
                    </Tooltip>
                    <Spacer />
                    <Divider orientation="vertical" width={1} height={15} borderColor='gray' />
                    <Spacer />
                    <Spacer />
                    <Spacer />
                    <FormControl display='flex' alignItems='center'>
                        <Box mr={2}><MdOutlineDarkMode size={20} /></Box>
                        <Switch id='theme-mode-toggle' onChange={toggleColorMode} isChecked={colorMode === 'light'} />
                        <Box ml={2}><MdOutlineLightMode size={20} /></Box>
                    </FormControl>
                </HStack>
            </Flex>
        </Flex>
    );
};
