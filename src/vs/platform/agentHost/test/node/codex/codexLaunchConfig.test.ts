/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { buildCodexLaunchConfig, buildCodexResumeParams } from '../../../node/codex/codexLaunchConfig.js';

suite('CodexLaunchConfig', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('adds the Copilot proxy without selecting it globally', () => {
		const config = buildCodexLaunchConfig({ PATH: '/bin', OPENAI_API_KEY: 'personal' }, { baseUrl: 'http://127.0.0.1:1234', nonce: 'nonce' }, ['--log-level=debug']);
		assert.deepStrictEqual(config.env, { PATH: '/bin', OPENAI_API_KEY: 'nonce', AI_AGENT: 'github_copilot_vscode_agent' });
		assert.ok(config.args.includes('model_providers.vscode-proxy.name="VS Code Proxy"'));
		assert.ok(!config.args.some(argument => argument.startsWith('model_provider=')));
		assert.ok(config.args.includes('features.image_generation=false'));
		assert.ok(config.args.includes('shell_environment_policy.set.AI_AGENT="github_copilot_vscode_agent"'));
		assert.strictEqual(config.args.at(-1), '--log-level=debug');
	});

	test('resume explicitly binds each session provider', () => {
		assert.deepStrictEqual(buildCodexResumeParams('openai', 'thread-a', {}), {
			threadId: 'thread-a',
			modelProvider: 'openai',
		});
		assert.deepStrictEqual(buildCodexResumeParams('vscode-proxy', 'thread-b', { GitHub: { url: 'https://api.githubcopilot.com/mcp/' } }), {
			threadId: 'thread-b',
			modelProvider: 'vscode-proxy',
			config: { mcp_servers: { GitHub: { url: 'https://api.githubcopilot.com/mcp/' } } },
		});
		assert.deepStrictEqual(buildCodexResumeParams('custom-provider', 'thread-c', {}, ['/repo-a', '/repo-b']), {
			threadId: 'thread-c',
			modelProvider: 'custom-provider',
			cwd: '/repo-a',
			runtimeWorkspaceRoots: ['/repo-a', '/repo-b'],
		});
	});
});
