'use client';

import Link from 'next/link';
import { CoachDashboard } from '@/components/coach/CoachDashboard';

export default function CoachModePage() {
  return (
    <div className="space-y-4">
      <div className="px-4 pt-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
        >
          Back
        </Link>
      </div>
      <CoachDashboard />
    </div>
  );
}
