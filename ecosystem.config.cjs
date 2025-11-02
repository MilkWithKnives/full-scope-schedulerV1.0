module.exports = {
	apps: [
		{
			name: 'svelteroster',
			script: './build/index.js',
			instances: 'max',
			exec_mode: 'cluster',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
				ORIGIN: 'https://yourdomain.com' // Update this to your actual domain
			},
			// Automatic restart configuration
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			// Error handling
			error_file: './logs/err.log',
			out_file: './logs/out.log',
			log_file: './logs/combined.log',
			time: true,
			// Graceful shutdown
			kill_timeout: 5000,
			wait_ready: true,
			listen_timeout: 10000
		}
	]
};
