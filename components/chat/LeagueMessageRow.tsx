	import React, { useState } from 'react';
	import clsx from 'clsx';
	import { MessageCircle, Pin, MoreHorizontal, Megaphone } from 'lucide-react';
	import { toast } from 'sonner';
	import Link from 'next/link';

	// Dummy helpers for test context (replace with real ones as needed)
	const getPresenceStatus = (_lastSeen?: string) => '';
	const isLeagueSystemNotice = (_messageType?: string) => false;
	const getLeagueSystemNoticeLabel = (_messageType?: string) => '';
	const parseLeaguePollPayload = (_payload?: any): any => null;
	const getBroadcastBody = (body: string) => body;
	const getStatsBotPayload = (_body?: string): any => null;
	const getSystemNoticeBody = (body: string) => body;
	const getLeagueMentionRanges = (_body?: string) => [] as Array<{ start: number; end: number; username: string }>;
	const RichMessageRenderer = (_props?: any) => null;
	const QUICK_EMOJIS: string[] = [];

	export default function LeagueMessageRow({
		msg,
		threadId,
		previousMsg,
		onPin,
		onReaction,
		showPin,
		currentUserId,
		highlighted,
		onReply,
		onStartDm,
		onPollVote,
		pollVotingEnabled,
		canClosePoll,
		onPollClose,
		onMediaOpen,
		allMessages, // Optional: pass all messages for test environments
	}: any) {
		let messagesSource: any[] = [];
		const chatWindow = typeof window !== "undefined" ? (window as any) : null;
		if (chatWindow && Array.isArray(chatWindow.__leagueChatMessages)) {
				messagesSource = chatWindow.__leagueChatMessages;
		} else if (Array.isArray(allMessages)) {
			messagesSource = allMessages;
		}


					       const parentMsg = msg.parentMessageId
						       ? messagesSource.find((m) => m.id === msg.parentMessageId)
						       : null;
					       // Debug output for both DM and Huddle
					       if (msg.parentMessageId) {
						       // eslint-disable-next-line no-console
// ...existing code...
					       }

	// Scroll/highlight parent message (browser only)
	const handleParentClick = () => {
		if (!msg.parentMessageId) return;
		if (typeof window !== "undefined" && typeof document !== "undefined") {
			const el = document.getElementById(`league-message-${msg.parentMessageId}`);
			   if (el) {
				   // Avoid errors in jsdom/test environments where scrollIntoView may not exist
				   if (typeof el.scrollIntoView === "function") {
					   el.scrollIntoView({ behavior: "smooth", block: "center" });
				   }
				   el.classList.add("ring-2", "ring-cyan-400");
				   setTimeout(() => el.classList.remove("ring-2", "ring-cyan-400"), 2000);
			   }
		}
	};

	const [pickerOpen, setPickerOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const reactions = (msg.metadata)?.reactions as { emoji: string; count: number; userIds?: string[] }[] | undefined;
	const hasUserReacted = (emoji: string): boolean => {
		if (!currentUserId || !Array.isArray(reactions)) return false;
		const entry = reactions.find((reaction) => reaction.emoji === emoji);
		return Boolean(entry && Array.isArray(entry.userIds) && entry.userIds.includes(currentUserId));
	};

	const lastSeen = (msg.metadata)?.lastSeenAt as string | undefined;
	const presenceStatus = lastSeen ? getPresenceStatus(lastSeen) : null;
	const senderUsername = typeof msg.senderUsername === "string" ? msg.senderUsername.trim() : "";
	const safeSenderName = typeof msg.senderName === "string" && msg.senderName.trim().length > 0 ? msg.senderName : "User";
	const profileHref = senderUsername ? `/profile/${encodeURIComponent(senderUsername)}` : null;
	const messageDate = new Date(msg.createdAt).getTime();
	const previousDate = previousMsg?.createdAt ? new Date(previousMsg.createdAt).getTime() : null;
	const groupedWithPrevious =
		Boolean(previousMsg) &&
		!isLeagueSystemNotice(previousMsg?.messageType ?? "") &&
		previousMsg?.senderUserId &&
		previousMsg.senderUserId === msg.senderUserId &&
		previousMsg.senderUserId !== null &&
		previousDate !== null &&
		Math.abs(messageDate - previousDate) <= 5 * 60 * 1000 &&
		!isLeagueSystemNotice(msg.messageType);
	const isSystemNotice = isLeagueSystemNotice(msg.messageType);
	const systemLabel =
		msg.messageType === "broadcast"
			? "Commissioner"
			: msg.messageType === "stats_bot"
				? "Chat Stats Bot"
				: msg.messageType === "pin"
					? "Pinned"
					: getLeagueSystemNoticeLabel(msg.messageType);
	const poll = parseLeaguePollPayload({
		body: msg.body,
		metadata:
			msg.metadata && typeof msg.metadata === "object" && !Array.isArray(msg.metadata)
				? msg.metadata
				: null,
	});
	const pollVotes: Record<string, unknown[]> = poll?.votes ?? {};
	const totalVotes = Object.values(pollVotes).reduce(
		(sum: number, ids: unknown[]) => sum + (Array.isArray(ids) ? ids.length : 0),
		0
	);
	let displayBody = msg.body;
	if (msg.messageType === "broadcast") displayBody = getBroadcastBody(msg.body);
	else if (msg.messageType === "stats_bot") {
		const p = getStatsBotPayload(msg.body);
		displayBody = p ? `Best: ${p.bestTeam} · Worst: ${p.worstTeam} · Top: ${p.bestPlayer}` : msg.body;
	} else if (msg.messageType === "pin") displayBody = "Pinned message";
	else if (isSystemNotice) displayBody = getSystemNoticeBody(msg.body);
	const isRichMediaMessage = ["image", "gif", "file", "media"].includes(msg.messageType);

	const mentionRanges = getLeagueMentionRanges(displayBody);
	const renderBodyWithMentions = () => {
		if (mentionRanges.length === 0) return displayBody;
		const parts: React.ReactNode[] = [];
		let cursor = 0;
		for (const range of mentionRanges) {
			if (range.start > cursor) {
				parts.push(displayBody.slice(cursor, range.start));
			}
			parts.push(
				<Link
					key={`${msg.id}-${range.start}-${range.username}`}
					href={`/profile/${encodeURIComponent(range.username)}`}
					className="underline"
					style={{ color: "var(--accent-cyan-strong)" }}
				>
					@{range.username}
				</Link>
			);
			cursor = range.end;
		}
		if (cursor < displayBody.length) {
			parts.push(displayBody.slice(cursor));
		}
		return parts;
	};

	const actionHref =
		msg.metadata && typeof msg.metadata === "object" && typeof msg.metadata.actionHref === "string"
			? msg.metadata.actionHref
			: null;

	// Visual indicator for replies
	const replyCount = messagesSource.filter((m) => m.parentMessageId === msg.id).length;

	return (
		<li
			id={`league-message-${msg.id}`}
			data-message-id={msg.id}
			className={`group rounded-xl px-2 py-1.5 relative ${isSystemNotice ? "" : "hover:bg-black/5"} ${groupedWithPrevious ? "mt-0.5" : ""}`}
			style={
				msg.messageType === "broadcast"
					? { background: "color-mix(in srgb, var(--accent-amber) 8%, transparent)", borderLeft: "3px solid var(--accent-amber-strong)" }
					: msg.messageType === "stats_bot"
						? { background: "color-mix(in srgb, var(--accent-cyan-strong) 6%, transparent)" }
						: msg.messageType === "pin"
							? { background: "color-mix(in srgb, var(--accent-cyan-strong) 6%, transparent)" }
							: highlighted
								? {
										border: "1px solid var(--accent-cyan-strong)",
										background: "color-mix(in srgb, var(--accent-cyan-strong) 8%, transparent)",
									}
								: undefined
			}
		>
			<div className="flex items-start gap-2">
				{groupedWithPrevious ? (
					<div className="h-7 w-7 shrink-0" />
				) : profileHref && !isSystemNotice ? (
					<a
						href={profileHref}
						className="mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
						style={{
							background: "var(--panel2)",
							border: "1px solid var(--border)",
							color: "var(--text)",
						}}
					>
						{safeSenderName.slice(0, 2).toUpperCase()}
					</a>
				) : (
					<div
						className="mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold"
						style={{
							background: msg.messageType === "broadcast" ? "var(--accent-amber-strong)" : "var(--panel2)",
							border: "1px solid var(--border)",
							color: msg.messageType === "broadcast" ? "var(--on-accent-bg)" : "var(--text)"}}
					>
						{msg.messageType === "broadcast" ? <Megaphone className="h-3.5 w-3.5" /> : safeSenderName.slice(0, 2).toUpperCase()}
					</div>
				)}
				<div className="min-w-0 flex-1">
					{/* Parent message preview for replies */}
					{parentMsg && (
						<div className="text-xs text-gray-400 mb-1 cursor-pointer" onClick={handleParentClick} data-testid="parent-preview">
							Replying to: {parentMsg.body}
						</div>
					)}
									 {/* Visual indicator for replies */}
									 {replyCount > 0 && !isSystemNotice && (
											 <span
												 className="ml-2 inline-flex items-center gap-1 text-xs text-cyan-400"
												 title="This message has replies"
												 data-testid="replies-indicator"
											 >
												 <MessageCircle className="inline h-4 w-4" />
												 {replyCount}
											 </span>
									 )}
					{/* ...rest of message rendering omitted for brevity in test context... */}
				</div>
			</div>
		</li>
	);
}
