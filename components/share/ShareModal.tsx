"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SharePayload, ShareDestination } from "@/lib/share-engine/types";
import { SharePreviewCard } from "./SharePreviewCard";
import { CopyLinkAction } from "./CopyLinkAction";
import { NativeShareAction } from "./NativeShareAction";
import { PlatformShareActions } from "./PlatformShareActions";

export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SharePayload;
  onShareComplete?: (destination: ShareDestination) => void;
  /** Show native share button (mobile); when clicked and not supported, keep modal open. */
  preferNativeOnMobile?: boolean;
}

export function ShareModal({
  open,
  onOpenChange,
  payload,
  onShareComplete,
  preferNativeOnMobile = true,
}: ShareModalProps) {
  const isMobile =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-4 sm:max-w-md"
        style={{ color: "var(--text)" }}
      >
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <SharePreviewCard payload={payload} />
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Copy link</span>
            <CopyLinkAction
              payload={payload}
              onCopy={() => onShareComplete?.("copy_link")}
              className="rounded-lg border border-border bg-muted/50 p-2 hover:bg-muted"
            />
          </div>
          {preferNativeOnMobile && isMobile && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Share via...</span>
              <NativeShareAction
                payload={payload}
                onShare={() => onOpenChange(false)}
                fallback={() => {}}
                className="rounded-lg border border-border bg-muted/50 p-2 hover:bg-muted"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              Share to
            </span>
            <PlatformShareActions
              payload={payload}
              onShareComplete={(dest) => {
                onShareComplete?.(dest);
                if (dest !== "copy_link" && dest !== "discord") {
                  onOpenChange(false);
                }
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
