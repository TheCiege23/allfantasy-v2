"use client";

import { useCallback, useState } from "react";
import type { SharePayload, ShareDestination } from "@/lib/share-engine/types";
import { trackShareAttempt } from "@/lib/share-engine/ShareTrackingService";

export function useShareModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const openShare = useCallback((p: SharePayload) => {
    setPayload(p);
    setOpen(true);
    trackShareAttempt({
      shareType: p.kind,
      destination: "copy_link",
      shareId: p.shareId,
      sport: p.sport,
    });
  }, []);

  const closeShare = useCallback(() => {
    setOpen(false);
    setPayload(null);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setPayload(null);
  }, []);

  return {
    open,
    onOpenChange,
    payload: payload ?? ({} as SharePayload),
    openShare,
    closeShare,
    hasPayload: !!payload,
  };
}
