export interface LegalContentSection {
  heading: string
  body: string
}

export const DISCLAIMER_PAGE_TITLE = "Disclaimer"

export const DISCLAIMER_PAGE_SECTIONS: LegalContentSection[] = [
  {
    heading: "Purpose of the Platform",
    body: "AllFantasy is for fantasy sports entertainment and management tools only.",
  },
  {
    heading: "No Gambling or DFS",
    body: "AllFantasy does not offer gambling, betting, DFS, or paid pick'em products.",
  },
  {
    heading: "League Dues and Payments",
    body: "AllFantasy does not process league dues, host prize pools, or distribute payouts directly; paid-league payments are external (e.g., FanCred).",
  },
  {
    heading: "AI Tools and Guidance",
    body: "AI outputs are informational guidance, not guaranteed outcomes.",
  },
  {
    heading: "Your Responsibility and Local Laws",
    body: "Users are responsible for compliance with local laws in their jurisdiction.",
  },
]
