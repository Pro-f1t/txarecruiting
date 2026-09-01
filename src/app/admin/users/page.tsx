import { requireStaff } from "@/lib/auth/guard";
import { getAllUsers } from "@/lib/firebase/users";
import { UserRole, ROLE_RANK } from "@/lib/models/User";
import UsersTable, { type UserRow } from "@/components/UsersTable";

export default async function AdminUsers() {
  const { uid, user } = await requireStaff();
  const isAdmin = user.role === UserRole.ADMIN;

  const users = await getAllUsers();
  const rows: UserRow[] = users
    .map((u) => ({ uid: u.uid, name: u.name, email: u.email, role: u.role }))
    .sort((a, b) => ROLE_RANK[a.role as UserRole] - ROLE_RANK[b.role as UserRole] || a.name.localeCompare(b.name));

  return (
    <div>
      <h1 className="t-card-title">Users</h1>
      <p className="t-body mt-2 text-muted">
        {isAdmin
          ? "Everyone who has signed in. Set each person as Admin, Exec, or Applicant."
          : "Everyone who has signed in. Only admins can change roles."}
      </p>
      <div className="mt-6">
        <UsersTable rows={rows} meUid={uid} canEdit={isAdmin} />
      </div>
    </div>
  );
}
