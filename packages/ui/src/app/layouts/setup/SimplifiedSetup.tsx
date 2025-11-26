import React, { useState } from 'react';
import { TermsScreen } from './TermsScreen';
import { ProvisionTokenScreen } from './ProvisionTokenScreen';

type SetupStep = 'terms' | 'provisionToken' | 'connected';

interface SimplifiedSetupProps {
    onSetupComplete?: (provisionToken: string) => void;
}

export const SimplifiedSetup: React.FC<SimplifiedSetupProps> = () => {
    const [currentStep, setCurrentStep] = useState<SetupStep>('terms');

    const handleTermsAccept = () => {
        setCurrentStep('provisionToken');
    };

    const handleProvisionTokenConnect = () => {
        setCurrentStep('connected');
        // TODO: Store API key in Redux store or local storage
        // Use setConfig slice, sets local state and db state
    };

    const handleBackToTerms = () => {
        setCurrentStep('terms');
    };

    switch (currentStep) {
    case 'terms':
        return <TermsScreen onAccept={handleTermsAccept} />;

    case 'provisionToken':
        return (
            <ProvisionTokenScreen
                onConnect={handleProvisionTokenConnect}
                onBack={handleBackToTerms}
            />
        );

    case 'connected':
        // This should not be reached as onSetupComplete should navigate away
        return null;

    default:
        return <TermsScreen onAccept={handleTermsAccept} />;
    }
};
