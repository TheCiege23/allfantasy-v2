"use client";

import React from "react";
import {
  Mail,
  MessageCircle,
  MessageSquare,
  Link2,
  type LucideIcon,
} from "lucide-react";
import type { SharePayload, ShareDestination } from "@/lib/share-engine/types";
import { getPlatformShareUrl } from "@/lib/share-engine/shareUrls";
import { trackShareAttempt, trackShareComplete } from "@/lib/share-engine/ShareTrackingService";

const DESTINATION_CONFIG: Record<
  ShareDestination,
  { label: string; icon: LucideIcon | React.ComponentType<{ className?: string }>; href?: boolean }
> = {
  copy_link: { label: "Copy link", icon: Link2, href: false },
  x: { label: "X (Twitter)", icon: MessageSquare, href: true },
  discord: { label: "Discord", icon: DiscordIcon, href: false },
  reddit: { label: "Reddit", icon: RedditIcon, href: true },
  email: { label: "Email", icon: Mail, href: true },
  sms: { label: "SMS", icon: MessageCircle, href: true },
};

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.88-7.004 4.88-3.874 0-7.004-2.186-7.004-4.88 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z" />
    </svg>
  );
}

export interface PlatformShareActionsProps {
  payload: SharePayload;
  onShareComplete?: (destination: ShareDestination) => void;
  className?: string;
  /** Destinations to show (default: all except copy_link which is separate). */
  destinations?: ShareDestination[];
  track?: boolean;
}

export function PlatformShareActions({
  payload,
  onShareComplete,
  className = "",
  destinations = ["x", "discord", "reddit", "email", "sms"],
  track = true,
}: PlatformShareActionsProps) {
  const handleCopy = () => {
    if (track) {
      trackShareAttempt({
        shareType: payload.kind,
        destination: "copy_link",
        shareId: payload.shareId,
        sport: payload.sport,
      });
      trackShareComplete({
        shareType: payload.kind,
        destination: "copy_link",
        shareId: payload.shareId,
        sport: payload.sport,
      });
    }
    onShareComplete?.("copy_link");
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Share to"
    >
      {destinations.map((dest) => {
        const config = DESTINATION_CONFIG[dest];
        if (!config) return null;
        const { label, icon: Icon, href } = config;
        const url = getPlatformShareUrl(dest, payload, {
          subject: payload.title,
          message: payload.description ?? payload.title,
        });

        const trackAndComplete = () => {
          if (track) {
            trackShareAttempt({
              shareType: payload.kind,
              destination: dest,
              shareId: payload.shareId,
              sport: payload.sport,
            });
            trackShareComplete({
              shareType: payload.kind,
              destination: dest,
              shareId: payload.shareId,
              sport: payload.sport,
            });
          }
          onShareComplete?.(dest);
        };

        const buttonClass =
          "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

        if (dest === "copy_link") {
          return (
            <button
              key={dest}
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(payload.url);
                  trackAndComplete();
                } catch {
                  // no-op
                }
              }}
              className={buttonClass}
              aria-label={label}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        }

        if (href) {
          return (
            <a
              key={dest}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass}
              aria-label={label}
              title={label}
              onClick={trackAndComplete}
            >
              <Icon className="h-5 w-5" />
            </a>
          );
        }

        if (dest === "discord") {
          return (
            <button
              key={dest}
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(payload.url);
                  trackAndComplete();
                } catch {
                  // no-op
                }
              }}
              className={buttonClass}
              aria-label={label}
              title="Copy link (paste in Discord)"
            >
              <DiscordIcon className="h-5 w-5" />
            </button>
          );
        }

        return null;
      })}
    </div>
  );
}
