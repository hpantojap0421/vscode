/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { codexAccountStateFromResponse } from '../../../node/codex/codexAccountState.js';

suite('CodexAccountState', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('maps ChatGPT identities as human accounts', () => {
		assert.deepStrictEqual(
			codexAccountStateFromResponse({ account: { type: 'chatgpt', email: 'private@example.com', planType: 'plus' }, requiresOpenaiAuth: true }),
			{ usageSource: 'openai', status: 'signedIn', authType: 'chatgpt', email: 'private@example.com', planType: 'plus', requiresOpenaiAuth: true },
		);
		assert.deepStrictEqual(
			codexAccountStateFromResponse({ account: { type: 'chatgpt', email: null, planType: 'team' }, requiresOpenaiAuth: true }),
			{ usageSource: 'openai', status: 'signedIn', authType: 'chatgpt', email: undefined, planType: 'team', requiresOpenaiAuth: true },
		);
	});

	test('distinguishes required sign-in from providers without OpenAI auth', () => {
		assert.deepStrictEqual(
			codexAccountStateFromResponse({ account: null, requiresOpenaiAuth: true }),
			{ usageSource: 'openai', status: 'signedOut', requiresOpenaiAuth: true },
		);
		assert.deepStrictEqual(
			codexAccountStateFromResponse({ account: null, requiresOpenaiAuth: false }),
			{ usageSource: 'openai', status: 'unavailable', requiresOpenaiAuth: false },
		);
	});

	test('does not classify API key or Bedrock credentials as human accounts', () => {
		assert.deepStrictEqual(
			codexAccountStateFromResponse({ account: { type: 'apiKey' }, requiresOpenaiAuth: true }),
			{ usageSource: 'openai', status: 'unavailable', authType: 'apiKey', requiresOpenaiAuth: true },
		);
		assert.deepStrictEqual(
			codexAccountStateFromResponse({ account: { type: 'amazonBedrock', credentialSource: 'awsManaged' }, requiresOpenaiAuth: false }),
			{ usageSource: 'openai', status: 'unavailable', authType: 'other', requiresOpenaiAuth: false },
		);
	});
});
