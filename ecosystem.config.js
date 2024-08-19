module.exports = {
  apps: [{
      name: "app",
      script: "./app.js",
      env: {
          NODE_ENV: "stage",
      },
      env_prod: {
          NODE_ENV: "prod",
      },
      autorestart: false,  // Prevents PM2 from restarting the app
      watch: false,        // Ensure watch mode is off to prevent restarts on file changes
      max_restarts: 0
  }]
};
