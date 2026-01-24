module.exports = {
    apps: [
        {
            name: "api_server",
            script: "server.js",
            max_memory_restart: '1500M',
            watch: true,       // change to true if you want auto-reload on file changes
            autorestart: true,  // restart on crash
            restart_delay: 5000,
            max_restarts: 10,
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};

