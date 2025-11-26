import React from 'react';

import './App.css';
import { Setup } from './containers/setup/Setup';
import { useAppSelector } from './hooks';
import { SimplifiedNavigation } from './containers/navigation/SimplifiedNavigation';

const App = (): JSX.Element => {
    const isSetupComplete: boolean = useAppSelector(state => state.config.tutorial_is_done) ?? false;
    console.log('tutorial_is_done:', isSetupComplete);
    
    // Temporarily force setup to show for testing
    // TODO: Remove this after testing
    // return (<Setup />);
    
    if (isSetupComplete) {
        return (<SimplifiedNavigation />);
        // return (<Navigation />);
    } else {
        return (<Setup />);
    }
};

export default App;
