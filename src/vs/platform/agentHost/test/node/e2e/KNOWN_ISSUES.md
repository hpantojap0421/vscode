# Disabled and conditional E2E tests

Current inventory of bundled-provider E2E tests disabled for at least one provider, platform, or execution mode. The test is the executable specification; this file records only active gaps. See the [README](./README.md) for test-authoring and troubleshooting guidance.

## Process

When a valid E2E scenario exposes a gap:

1. Minimize it and identify the affected provider, platform, and mode.
2. Keep the test, but gate only the affected variant.
3. Record the exact title, scope, expected and observed behavior, gate, and focused reproduction here.
4. Record symptoms, not unverified root-cause hypotheses.
5. Keep generated captures for variants expected to run again; never hand-edit them.
6. Remove the gate, entry, stale comments, and orphaned artifacts together when the gap closes.

Expected capability skips are tracked separately from suspected bugs.

## Suspected product bugs

### Claude provider-context fork

- Tests:
  - `forked peer chat inherits source history through the provider`
  - `unknown-turn fork does not inherit source provider context`
- Scope: Claude.
- Expected: a provider-backed fork continues from the requested source history.
- Observed: the forked chat's AHP transcript is seeded, but its model request has no source history. The model cannot recall the source conversation, and no error reaches the client.
- Cause confirmed by investigation: `resolveForkAnchorUuid` matches the client-assigned AHP turn id against Claude SDK envelope UUIDs. When it cannot resolve the anchor, `_forkChat` returns `undefined` and chat creation silently continues with fresh provider context.
- Gate: `supportsChatForkE2E: false`.
- Issue: [#328104](https://github.com/microsoft/vscode/issues/328104).
- Reproduce:

  ```bash
  ./scripts/test-integration.sh --run \
    src/vs/platform/agentHost/test/node/e2e/providers/claudeAgentHostE2E.integrationTest.ts \
    --grep "forked peer chat inherits source history through the provider"
  ```

  Temporarily enable `supportsChatForkE2E`.

The same defect prevents refreshing Claude's `side chat receives bounded source context without copied history` capture. The side chat falls back to an injected `<side-chat-context>` preamble instead of a provider fork, so its pre-defect fixture is listed in `STALE_RECORDED_REQUEST_EXCEPTIONS`. After fixing the fork, remove that exception and re-record:

```bash
AGENT_HOST_UPDATE_SNAPSHOTS=1 ./scripts/test-integration.sh --run \
  src/vs/platform/agentHost/test/node/e2e/providers/claudeAgentHostE2E.integrationTest.ts \
  --grep "side chat receives bounded source context"
```

## Platform and deterministic-replay limitations

### Copilot prompt snapshots on Windows

- Tests: all models in `copilotPromptsE2E.integrationTest.ts`.
- Scope: Windows.
- Expected: one committed baseline per model describes the prompt assembled by the bundled CLI.
- Observed: the Windows prompt includes PowerShell-specific instructions and host-probed capabilities, so it is not a stable renaming of the POSIX prompt.
- Gate: `process.platform === 'win32'`.
- Reproduce:

  ```bat
  scripts\test-integration.bat --run src\vs\platform\agentHost\test\node\e2e\providers\copilotPromptsE2E.integrationTest.ts
  ```

Closing this requires separately reviewed Windows baselines generated on runners with consistent PowerShell capabilities. Linux and macOS already detect provider-wide prompt drift.

### Windows shell and filesystem behavior

| Test | Disabled scope | Observed limitation |
|---|---|---|
| `a bang command runs locally and exposes terminal output` | Windows | The successful bang command produces output but does not complete reliably. |
| `resource watch reports changes on its subscribed channel` | Windows | The subscribed filesystem watch does not emit `resourceWatch/changed` after a protocol `resourceWrite` within the test timeout. Descriptor, missing-root, and resource mutation coverage remain enabled. |
| `worktree session uses the resolved worktree as working directory` | Windows | `os.tmpdir()` yields an 8.3 short path while the shell reports the long path, and Copilot's completed host-terminal call publishes no terminal-content notification. |
| ``strips redundant `cd <workingDirectory> &&` prefix from shell tool calls`` | Copilot on Windows | The turn completes, but `chat/toolCallReady` omits the `toolInput` needed to assert that the prefix was removed. |

Copilot's ordinary provider shell also omits `ToolResultTerminalContent.result.preview` on Windows, while its terminal-shaped resource is not backed by the host terminal manager and cannot be subscribed. These tests are skipped for Copilot on Windows because their direct output oracle would otherwise be empty:

- `lists workspace entries`
- `runs a deterministic shell command`
- `inspects git status`

Use the affected provider command with `--grep "<exact test title>"` and temporarily remove the platform gate to reevaluate a row.

### Codex shell-tool replay on Linux

- Scope: Codex on Linux in deterministic replay.
- Expected: recorded `exec_command` turns emit their tool lifecycle and complete.
- Observed: packaged Linux completes the recorded turn without command-execution notifications.
- Gate: `shellToolReplayUnstableOnLinux: true`. Recording and other platforms remain enabled.
- Affected tests: every file-operation scenario using `fileOperationStrategy: 'shell'`, plus other call sites guarded by `portableShellToolReplayEnabled` (permission, worktree, and deterministic shell scenarios). Read the call sites for the exact current set.
- Reproduce:

  ```bash
  ./scripts/test-integration.sh --run \
    src/vs/platform/agentHost/test/node/e2e/providers/codexAgentHostE2E.integrationTest.ts
  ```

  Temporarily clear `shellToolReplayUnstableOnLinux`.

### Claude subagent replay on Windows

- Test: `reopening a session keeps sub-agent messages out of the parent transcript (replay path)`.
- Scope: Claude on Windows.
- Expected: the reopened parent transcript excludes subagent-only messages.
- Observed: Claude reconstructs the subagent transcript from `subagents/agent-*.jsonl`, which is not reliably visible immediately on Windows.
- Gate: `subagentReplayUnstableOnWindows: true`.
- Related investigation: [#325284](https://github.com/microsoft/vscode/pull/325284).
- Reproduce: temporarily clear the gate and run the exact title with `scripts\test-integration.bat`.

### Git-status snapshot ordering

- Test: `inspects git status`.
- Scope: Claude and Codex.
- Expected: the behavior snapshot contains stable semantic tool traffic.
- Observed: customization and changeset notifications occur at nondeterministic points in the snapshot.
- Gate: enabled only for Copilot, subject to shell-platform gates.
- Reproduce: enable the provider variant and record the exact title with `AGENT_HOST_UPDATE_SNAPSHOTS=1`.

### Mid-turn abort is record-only

- Tests:
  - `can abort a running turn`
  - `accepted steering followed by abort does not block the replacement turn`
- Scope: deterministic replay for every provider; the second test is Copilot-specific.
- Reason: replay serves the intentionally truncated response immediately, leaving no real streaming window in which to abort.
- Gate: direct `AGENT_HOST_REPLAY_RECORD=1` mode only.
- Run:

  ```bash
  AGENT_HOST_REPLAY_RECORD=1 ./scripts/test-integration.sh --run \
    src/vs/platform/agentHost/test/node/e2e/providers/copilotAgentHostE2E.integrationTest.ts \
    --grep "can abort a running turn"

  AGENT_HOST_REPLAY_RECORD=1 ./scripts/test-integration.sh --run \
    src/vs/platform/agentHost/test/node/e2e/providers/copilotAgentHostE2E.integrationTest.ts \
    --grep "accepted steering followed by abort"
  ```

## Test-prompt limitation

### Claude plan-mode prompt

- Test: `planning-mode session-state writes are auto-approved in default mode`.
- Scope: Claude.
- Expected: the prompt drives the provider to invoke `ExitPlanMode`.
- Observed: plan mode is wired, but the Copilot-oriented prompt does not reliably cause Claude to invoke the tool.
- Gate: `supportsPlanMode: false`.
- Next step: use a provider-neutral or Claude-specific prompt without weakening the plan-mode assertions.
- Reproduce: temporarily enable `supportsPlanMode` and record the exact title.

## Expected capability skips

| Capability | Gate | Provider(s) skipped | Effect |
|---|---|---|---|
| Multiple chats | `supportsMultipleChats` | Codex | Model-backed peer-chat scenarios skip; the negative capability test still runs. |
| Chat fork | `supportsChatForkE2E` | Codex | Provider-backed fork scenarios skip. Claude's use of the same gate is the bug above. |
| Subagents | `supportsSubagents` | Codex | Subagent routing and reopen scenarios skip. |
| Streaming file creation | `streamingFileCreateToolName` | Codex | Argument-delta coverage requires a native file-creation tool; shell-backed file behavior is covered separately. |
| Plan mode | `supportsPlanMode` | Codex | The plan-mode scenario skips. Claude's use of the same gate is the prompt limitation above. |

The entire Claude or Codex suite also skips when its bundled SDK package is unavailable; that is an environment prerequisite, not a product gap.

## Review checklist

1. Run the full conformance and provider files; shared-process failures can depend on suite order.
2. Reevaluate broad provider gates one title at a time and check whether a capture exists.
3. Re-record narrowly after SDK/CLI behavior changes and review every generated artifact.
4. Remove fixed gates, entries, comments, and orphaned captures together.
