import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ImportPageClient } from "./ImportPageClient";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const sp =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const returnToRaw =
    typeof sp.returnTo === "string" ? sp.returnTo : Array.isArray(sp.returnTo) ? sp.returnTo[0] : "";
  const returnTo = returnToRaw?.startsWith("/") ? returnToRaw : "/create-league";

  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string };
  } | null;

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(
      `/import?returnTo=${encodeURIComponent(returnTo)}`
    );
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  return <ImportPageClient userId={session.user.id} returnTo={returnTo} />;
}
