"use client";

import { useCallback, useState } from "react";
import type { SharePayload } from "@/lib/share-engine/types";
import { trackShareModalOpened } from "@/lib/share-engine/ShareTrackingService";

export function useShareModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const openShare = useCallback((nextPayload: SharePayload, options?: { surface?: string }) => {
    setPayload(nextPayload);
    setOpen(true);
    trackShareModalOpened({
      shareType: nextPayload.kind,
      shareId: nextPayload.shareId,
      sport: nextPayload.sport?.toString(),
      shareUrl: nextPayload.url,
      visibility: nextPayload.visibility,
      surface: options?.surface ?? "share_modal",
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
