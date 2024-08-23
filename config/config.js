const env = require("./env");

const args = process.argv.slice(2);
const [envType = 'stage'] = args; // Default to 'stage' if no argument is provided

const config = env[envType];

module.exports = config;
