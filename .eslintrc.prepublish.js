module.exports = {
	...require('./.eslintrc.js'),
	rules: {
		...require('./.eslintrc.js').rules,
		// Stricter rules for publishing
		'no-console': 'error',
	},
};
