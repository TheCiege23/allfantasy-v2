import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("World Cup chat render regression guard", () => {
  it("keeps old settings/commissioner panels out of the primary chat drawer source", () => {
    const source = readFileSync(
      join(process.cwd(), "components/brackets/world-cup/WorldCupBracketShell.tsx"),
      "utf8"
    )

    expect(source).toContain('data-testid="wc-chat-active-panel"')
    expect(source).toContain('data-testid="wc-chat-composer-shell"')
    expect(source).not.toContain("WorldCupNotificationSettingsCard")
    expect(source).not.toContain("Latest Pool Updates")
    expect(source).not.toContain("Commissioner Announcements")
    expect(source).not.toContain("System Reminders")
    expect(source).not.toContain("Moderation")
  })
})
