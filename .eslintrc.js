module.exports = {
	root: true,
	env: {
		node: true,
		es2020: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	plugins: [
		'n8n-nodes-base',
	],
	extends: [
		'eslint:recommended',
		'plugin:n8n-nodes-base/nodes',
	],
	rules: {
		// Allow console.log for debugging
		'no-console': 'warn',
		// Disable some rules that don't work well with TypeScript
		'no-undef': 'off',
		'no-unused-vars': 'off',
		// Disable n8n rules that conflict with proper TypeScript usage
		'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
		'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
	},
	ignorePatterns: [
		'dist/',
		'node_modules/',
		'*.js',
	],
};
