/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { RootState } from './state/protocol/state.js';

export const CODEX_ACCOUNT_META_KEY = 'vscode.codexAccount';
export const CODEX_ACCOUNT_SIGN_IN_REQUEST_KEY = 'vscode.codexAccount.signInRequest';
export const CODEX_ACCOUNT_SIGN_OUT_REQUEST_KEY = 'vscode.codexAccount.signOutRequest';

export interface ICodexAccountInfo {
	readonly status: 'unknown' | 'signedIn' | 'signedOut' | 'unavailable' | 'error';
	readonly email?: string;
	readonly planType?: string;
	readonly requiresOpenaiAuth?: boolean;
	readonly authUrl?: string;
	readonly authUrlNonce?: string;
}

export function readCodexAccountInfo(state: RootState | undefined): ICodexAccountInfo {
	// eslint-disable-next-line local/code-no-untyped-meta-access -- sanctioned reader for the namespaced Codex account slot; validated below.
	const metaValue = state?._meta?.[CODEX_ACCOUNT_META_KEY];
	const value = state?.config?.values[CODEX_ACCOUNT_META_KEY] ?? metaValue;
	if (!value || typeof value !== 'object') {
		return { status: 'unknown' };
	}
	const account = value as Partial<ICodexAccountInfo>;
	if (account.status !== 'unknown' && account.status !== 'signedIn' && account.status !== 'signedOut' && account.status !== 'unavailable' && account.status !== 'error') {
		return { status: 'unknown' };
	}
	return {
		status: account.status,
		email: typeof account.email === 'string' ? account.email : undefined,
		planType: typeof account.planType === 'string' ? account.planType : undefined,
		requiresOpenaiAuth: typeof account.requiresOpenaiAuth === 'boolean' ? account.requiresOpenaiAuth : undefined,
		authUrl: typeof account.authUrl === 'string' ? account.authUrl : undefined,
		authUrlNonce: typeof account.authUrlNonce === 'string' ? account.authUrlNonce : undefined,
	};
}
