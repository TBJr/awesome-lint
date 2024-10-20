import process from 'node:process';
import test from 'ava';
import esmock from 'esmock';
import lint from '../_lint.js';

const config = {
	plugins: [
		await esmock('../../rules/github.js'),
	],
};

let github;

test.beforeEach(async () => {
	github = await esmock('../../rules/github.js');
});

test.afterEach.always(async () => {
	await esmock.purge(github);
});

// Retaining .failing modifier for expected failures
test.serial.failing('github - error invalid git repo', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async () => {
				throw new Error('"git" command not found');
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'Awesome list must reside in a valid git repository',
		},
	]);
});

test.serial.failing('github - repo without description and license', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => ({
				body: {
					description: null,
					topics: ['awesome', 'awesome-list'],
					license: null,
				},
			}),
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'The repository should have a description',
		},
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'License was not detected by GitHub',
		},
	]);
});

test.serial.failing('github - missing topic awesome-list', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => ({
				body: {
					description: 'Awesome lint',
					topics: ['awesome'],
					license: {
						key: 'mit',
					},
				},
			}),
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'The repository should have "awesome-list" as a GitHub topic',
		},
	]);
});

test.serial.failing('github - missing topic awesome', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => ({
				body: {
					description: 'Awesome lint',
					topics: ['awesome-list'],
					license: {
						key: 'mit',
					},
				},
			}),
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'The repository should have "awesome" as a GitHub topic',
		},
	]);
});

test.serial.failing('github - remote origin is a GitLab repo', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'https://gitlab.com/sindresorhus/awesome-lint-test.git';
				}
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'Repository should be on GitHub',
		},
	]);
});

test.serial.failing('github - invalid token', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => {
				throw { statusCode: 401 };
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'Unauthorized access or token is invalid',
		},
	]);
});

test.serial.failing('github - API rate limit exceeded with token', async t => {
	process.env.github_token = 'abcd';

	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => {
				throw {
					statusCode: 403,
					headers: {
						'x-ratelimit-limit': 5000,
					},
				};
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'API rate limit of 5000 requests per hour exceeded',
		},
	]);

	delete process.env.github_token;
});

test.serial.failing('github - API rate limit exceeded without token', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => {
				throw {
					statusCode: 403,
					headers: {
						'x-ratelimit-limit': 60,
					},
				};
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'API rate limit of 60 requests per hour exceeded. Use a personal token to increase the number of requests',
		},
	]);
});

test.serial.failing('github - API offline', async t => {
	const githubMock = await esmock('../../rules/github.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'remote') {
					return 'git@github.com:sindresorhus/awesome-lint-test.git';
				}
			},
		},
		got: {
			get: async () => {
				throw {
					message: 'getaddrinfo ENOTFOUND api.github.com api.github.com:443',
					code: 'ENOTFOUND',
				};
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/github/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-github',
			message: 'There was a problem trying to connect to GitHub: getaddrinfo ENOTFOUND api.github.com api.github.com:443',
		},
	]);
});
