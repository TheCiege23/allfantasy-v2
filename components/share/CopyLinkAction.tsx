"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import type { SharePayload } from "@/lib/share-engine/types";
import { trackShareAttempt, trackShareComplete } from "@/lib/share-engine/ShareTrackingService";

export interface CopyLinkActionProps {
  payload: SharePayload;
  onCopy?: () => void;
  className?: string;
  /** Track with this destination (copy_link). */
  track?: boolean;
}

export function CopyLinkAction({
  payload,
  onCopy,
  className = "",
  track = true,
}: CopyLinkActionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = payload.url;
    const text = payload.description
      ? `${payload.title}\n${payload.description}\n${url}`
      : `${payload.title}\n${url}`;

    if (track) {
      trackShareAttempt({
        shareType: payload.kind,
        destination: "copy_link",
        shareId: payload.shareId,
        sport: payload.sport,
      });
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (track) {
        trackShareComplete({
          shareType: payload.kind,
          destination: "copy_link",
          shareId: payload.shareId,
          sport: payload.sport,
        });
      }
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy URL only
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        if (track) {
          trackShareComplete({
            shareType: payload.kind,
            destination: "copy_link",
            shareId: payload.shareId,
            sport: payload.sport,
          });
        }
        onCopy?.();
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // no-op
      }
    }
  }, [payload, onCopy, track]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label="Copy link"
      title="Copy link"
    >
      {copied ? (
        <Check className="h-5 w-5 text-green-500" aria-hidden />
      ) : (
        <Copy className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
