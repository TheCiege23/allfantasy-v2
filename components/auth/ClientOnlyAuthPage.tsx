"use client";

import { useEffect, useState, type ReactNode } from "react";

export function ClientOnlyAuthPage({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#080611] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
          <div className="text-center text-2xl font-bold">AllFantasy</div>
          <div className="mt-6 text-center text-sm text-white/60">Loading...</div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
