import UsersTable from "./users-table";
import ShellVariantSetter from "@/app/shell/ShellVariant";
import { listUsersDirectory } from "@/server/services/usersView";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const rows = await listUsersDirectory();

  return (
    <>
      <ShellVariantSetter variant="full" />

      <div className="space-y-4">
        <h1 className="header-font-archimoto text-[15px] leading-none uppercase">Users</h1>

        <UsersTable initialRows={rows} />
      </div>
    </>
  );
}
