/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { GetAccountResponse } from './protocol/generated/v2/GetAccountResponse.js';

export interface ICodexAccountState {
	readonly usageSource: 'openai' | 'copilot';
	readonly status: 'unknown' | 'signedIn' | 'signedOut' | 'unavailable' | 'error';
	readonly authType?: 'chatgpt' | 'apiKey' | 'other';
	readonly email?: string;
	readonly planType?: string;
	readonly requiresOpenaiAuth?: boolean;
	readonly error?: string;
}

export function codexAccountStateFromResponse(response: GetAccountResponse): ICodexAccountState {
	if (response.account?.type === 'chatgpt') {
		return { usageSource: 'openai', status: 'signedIn', authType: 'chatgpt', email: response.account.email ?? undefined, planType: response.account.planType, requiresOpenaiAuth: response.requiresOpenaiAuth };
	}
	if (response.account?.type === 'apiKey') {
		return { usageSource: 'openai', status: 'unavailable', authType: 'apiKey', requiresOpenaiAuth: response.requiresOpenaiAuth };
	}
	if (response.account) {
		return { usageSource: 'openai', status: 'unavailable', authType: 'other', requiresOpenaiAuth: response.requiresOpenaiAuth };
	}
	return { usageSource: 'openai', status: response.requiresOpenaiAuth ? 'signedOut' : 'unavailable', requiresOpenaiAuth: response.requiresOpenaiAuth };
}
