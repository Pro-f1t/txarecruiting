import { requireStaff } from "@/lib/auth/guard";
import { getAllUsers } from "@/lib/firebase/users";
import { getAllConversations } from "@/lib/firebase/conversations";
import { UserRole } from "@/lib/models/User";
import ConversationsManager, { type ConvRow } from "@/components/ConversationsManager";

export const dynamic = "force-dynamic";

export default async function AdminConversations() {
  const { uid: meUid } = await requireStaff();

  const [users, convs] = await Promise.all([getAllUsers(), getAllConversations()]);
  const applicants = users.filter((u) => u.role === UserRole.APPLICANT);

  const byApplicant = new Map<string, typeof convs>();
  for (const c of convs) {
    const list = byApplicant.get(c.applicantUid) ?? [];
    list.push(c);
    byApplicant.set(c.applicantUid, list);
  }

  const rows: ConvRow[] = applicants.map((u) => {
    const list = byApplicant.get(u.uid) ?? [];
    const mine = list.find((c) => c.staffUid === meUid);
    return {
      uid: u.uid,
      name: u.name,
      email: u.email,
      talkedByMe: !!mine,
      myComment: mine?.comment ?? "",
      others: list.filter((c) => c.staffUid !== meUid).map((c) => ({ staffName: c.staffName ?? "An exec", comment: c.comment ?? "" })),
    };
  });

  return (
    <div>
      <h1 className="t-card-title">Conversations</h1>
      <p className="t-body mt-2 text-muted">
        Mark anyone you&apos;ve talked to at a coffee chat or info session, with an optional note. Everyone&apos;s conversations show on the applicant&apos;s application and in review.
      </p>
      <div className="mt-6">
        <ConversationsManager rows={rows} />
      </div>
    </div>
  );
}
