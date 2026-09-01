import { requireAdmin } from "@/lib/auth/guard";
import { getAllUsers } from "@/lib/firebase/users";
import UsersTable, { type UserRow } from "@/components/UsersTable";

export default async function AdminUsers() {
  const { uid } = await requireAdmin();
  const users = await getAllUsers();
  const rows: UserRow[] = users.map((u) => ({ uid: u.uid, name: u.name, email: u.email, role: u.role }));
  return (
    <div>
      <h1 className="t-card-title">Users</h1>
      <p className="t-body mt-2 text-muted">Everyone who has signed in. Roles are managed directly in Firebase (Firestore → users).</p>
      <div className="mt-6">
        <UsersTable rows={rows} meUid={uid} />
      </div>
    </div>
  );
}
