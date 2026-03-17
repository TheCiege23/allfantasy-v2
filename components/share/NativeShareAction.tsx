"use client";

import { useCallback } from "react";
import { Share2 } from "lucide-react";
import type { SharePayload, ShareDestination } from "@/lib/share-engine/types";
import { trackShareAttempt, trackShareComplete } from "@/lib/share-engine/ShareTrackingService";

export interface NativeShareActionProps {
  payload: SharePayload;
  onShare?: () => void;
  className?: string;
  /** If native share not supported, call this (e.g. open modal). */
  fallback?: () => void;
  track?: boolean;
}

export function NativeShareAction({
  payload,
  onShare,
  className = "",
  fallback,
  track = true,
}: NativeShareActionProps) {
  const handleClick = useCallback(async () => {
    const shareData: ShareData = {
      title: payload.title,
      text: payload.description ?? payload.title,
      url: payload.url,
    };
    if (payload.imageUrl) shareData.url = payload.url; // some clients support image via url

    if (typeof navigator !== "undefined" && navigator.share) {
      if (track) {
        trackShareAttempt({
          shareType: payload.kind,
          destination: "copy_link",
          shareId: payload.shareId,
          sport: payload.sport,
        });
      }
      try {
        await navigator.share(shareData);
        if (track) {
          trackShareComplete({
            shareType: payload.kind,
            destination: "copy_link",
            shareId: payload.shareId,
            sport: payload.sport,
          });
        }
        onShare?.();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          fallback?.();
        }
      }
    } else {
      fallback?.();
    }
  }, [payload, onShare, fallback, track]);

  const canNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

  if (!canNativeShare && !fallback) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label="Share"
      title={canNativeShare ? "Share" : "Open share options"}
    >
      <Share2 className="h-5 w-5" aria-hidden />
    </button>
  );
}
