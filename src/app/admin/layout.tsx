import { redirect } from "next/navigation";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { UserRole, canReviewApplications } from "@/lib/models/User";
import AdminNav from "@/components/AdminNav";
import RefreshButton from "@/components/RefreshButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false;
  let canReview = false;
  try {
    const { user } = await requireStaff();
    isAdmin = user.role === UserRole.ADMIN;
    canReview = canReviewApplications(user);
  } catch (error) {
    if (guardErrorStatus(error) === 403) redirect("/dashboard");
    redirect("/auth/login");
  }
  return (
    <section className="shell pt-24 pb-24">
      <div className="flex items-center justify-between gap-4">
        <p className="t-eyebrow">Exec console</p>
        <RefreshButton />
      </div>
      <div className="mt-4">
        <AdminNav isAdmin={isAdmin} canReview={canReview} />
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
