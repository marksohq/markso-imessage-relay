const webpack = require('webpack');

module.exports = function override(config, env) {
    config.target = 'electron-renderer';
    
    // Determine default API URL based on environment
    const isProduction = env === 'production';
    const defaultApiUrl = isProduction 
        ? 'https://api.nurture.markso.io'
        : 'https://usable-uniquely-kit.ngrok-free.app';
    
    // Inject environment variables at build time
    config.plugins = config.plugins || [];
    config.plugins.push(
        new webpack.DefinePlugin({
            'process.env.API_BASE_URL': JSON.stringify(
                process.env.API_BASE_URL || defaultApiUrl
            ),
        })
    );
    
    return config;
};