import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Your League \u2013 AllFantasy",
  description:
    "Import your fantasy league from Sleeper or ESPN to get rankings and insights. Coverage varies by provider.",
};

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
