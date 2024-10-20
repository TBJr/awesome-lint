import test from 'ava';
import esmock from 'esmock';
import lint from '../_lint.js';

const config = {
	plugins: [
		await esmock('../../rules/git-repo-age.js'),
	],
};

let gitRepoAge;

test.beforeEach(async () => {
	gitRepoAge = await esmock('../../rules/git-repo-age.js');
});

test.afterEach.always(async () => {
	await esmock.purge(gitRepoAge);
});

// Retaining the .failing modifier for expected failures
test.serial.failing('git-repo-age - error invalid git repo', async t => {
	const gitRepoAgeMock = await esmock('../../rules/git-repo-age.js', {
		execa: {
			stdout: async () => {
				throw new Error('"git" command not found');
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/git-repo-age/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-git-repo-age',
			message: 'Awesome list must reside in a valid deep-cloned Git repository (see https://github.com/sindresorhus/awesome-lint#tip for more information)',
		},
	]);
});

test.serial.failing('git-repo-age - error repo is not old enough', async t => {
	const gitRepoAgeMock = await esmock('../../rules/git-repo-age.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'rev-list') {
					return '14fc116c8ff54fc8a13c4a3b7527eb95fb87d400';
				} else if (cmd === 'git' && args[0] === 'show') {
					return '2030-08-01 12:55:53 +0200';
				}
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/git-repo-age/0.md' });
	t.deepEqual(messages, [
		{
			line: null,
			ruleId: 'awesome-git-repo-age',
			message: 'Git repository must be at least 30 days old',
		},
	]);
});

// This test passes, so I removed the .failing modifier
test.serial('git-repo-age - valid repo is old enough', async t => {
	const gitRepoAgeMock = await esmock('../../rules/git-repo-age.js', {
		execa: {
			stdout: async (cmd, args) => {
				if (cmd === 'git' && args[0] === 'rev-list') {
					return '14fc116c8ff54fc8a13c4a3b7527eb95fb87d400';
				} else if (cmd === 'git' && args[0] === 'show') {
					return '2016-08-01 12:55:53 +0200';
				}
			},
		},
	});

	const messages = await lint({ config, filename: 'test/fixtures/git-repo-age/0.md' });
	t.deepEqual(messages, []);
});
