/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AiAgentEnvValue, AiAgentEnvVar } from '../../../chat/common/aiAgentEnv.js';
import type { ThreadResumeParams } from './protocol/generated/v2/ThreadResumeParams.js';
import type { JsonValue } from './protocol/generated/serde_json/JsonValue.js';

export interface ICodexLaunchProxy {
	readonly baseUrl: string;
	readonly nonce: string;
}

export interface ICodexLaunchConfig {
	readonly env: NodeJS.ProcessEnv;
	readonly args: readonly string[];
}

export function buildCodexResumeParams(modelProvider: string, threadId: string, mcpServers: Readonly<Record<string, unknown>>, workingDirectories?: readonly string[]): ThreadResumeParams {
	return {
		threadId,
		modelProvider,
		...(workingDirectories?.length ? {
			cwd: workingDirectories[0],
			runtimeWorkspaceRoots: [...workingDirectories],
		} : {}),
		...(Object.keys(mcpServers).length > 0 ? { config: { mcp_servers: mcpServers as JsonValue } } : {}),
	};
}

export function buildCodexLaunchConfig(
	inheritedEnv: NodeJS.ProcessEnv,
	proxy: ICodexLaunchProxy,
	extraArgs: readonly string[],
): ICodexLaunchConfig {
	const env: NodeJS.ProcessEnv = { ...inheritedEnv, [AiAgentEnvVar]: AiAgentEnvValue };
	env.OPENAI_API_KEY = proxy.nonce;
	const overrides = [
		`model_providers.vscode-proxy.name="VS Code Proxy"`,
		`model_providers.vscode-proxy.base_url="${proxy.baseUrl}/v1"`,
		`model_providers.vscode-proxy.wire_api="responses"`,
		`model_providers.vscode-proxy.env_key="OPENAI_API_KEY"`,
		`model_providers.vscode-proxy.requires_openai_auth=false`,
		`model_providers.vscode-proxy.supports_websockets=false`,
		// Codex filters its shell tool's env through `shell_environment_policy`,
		// so pin the marker there too — a user policy (e.g. `inherit = "core"`)
		// would otherwise drop it.
		`shell_environment_policy.set.${AiAgentEnvVar}="${AiAgentEnvValue}"`,
		`features.tool_call_mcp_elicitation=false`,
		`features.image_generation=false`,
	];
	return {
		env,
		args: ['app-server', ...overrides.flatMap(value => ['-c', value]), ...extraArgs],
	};
}
