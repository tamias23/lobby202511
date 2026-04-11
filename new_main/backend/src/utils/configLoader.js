const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Loads configuration from backend-config.yaml and merges it into process.env.
 * Standard environment variables already set in the shell take precedence.
 */
function loadConfig() {
    const configPath = path.join(__dirname, '../../backend-config.yaml');
    
    if (fs.existsSync(configPath)) {
        try {
            const fileContents = fs.readFileSync(configPath, 'utf8');
            const data = yaml.load(fileContents);
            
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(key => {
                    // Precedence: process.env > backend-config.yaml
                    if (process.env[key] === undefined) {
                        process.env[key] = String(data[key]);
                    }
                });
                console.log(`[Config] Loaded configuration from ${configPath}`);
            }
        } catch (e) {
            console.error(`[Config] Failed to parse ${configPath}:`, e.message);
        }
    } else {
        console.warn(`[Config] No config found at ${configPath}, relying on shell environment.`);
    }
}

// Execute immediately when required
loadConfig();

module.exports = process.env;
