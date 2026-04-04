import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isSchoolAdmin } from "@/lib/rbac";
import RolePermissionsSettingsClient from "@/components/settings/RolePermissionsSettingsClient";

export default async function RolePermissionsSettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    if (!isSchoolAdmin(session.user)) {
        redirect("/dashboard");
    }

    return <RolePermissionsSettingsClient />;
}
