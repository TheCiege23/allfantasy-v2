---
name: Chat Test Generator
description: "Generate targeted regression tests for DMs, AF Huddle, and League chat bugs or features."
argument-hint: "Describe the chat behavior or bug and the files/features involved."
agent: "Chat Systems Implementation Agent"
---
Generate a focused test plan and test code updates for the provided chat behavior:

Input:
$ARGUMENTS

Requirements:
- Prefer existing test patterns and file organization in this repository.
- Cover both success and failure paths.
- Include realtime/event-order edge cases when relevant.
- Keep tests deterministic and avoid brittle timing assumptions.
- If a behavior spans layers, propose the smallest reliable set of unit/integration/e2e coverage.

Output:
- Suggested test files to create or update
- Concrete test cases (titles and assertions)
- Implementation notes for fixtures/mocks
- Any follow-up checks to run locally
