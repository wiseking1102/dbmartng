import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";

// GET /api/admin/sub-admins — Fetch all sub-admins with user info and permissions
export async function GET() {
  try {
    const adminClient = createAdminClient();

    const { data: subAdmins, error } = await adminClient
      .from("sub_admins")
      .select(`
        *,
        users!sub_admins_user_id_fkey(id, email, full_name, avatar_url, role, created_at),
        invited_by_user:users!sub_admins_invited_by_fkey(id, email, full_name),
        sub_admin_permissions(id, permission_key, granted)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Sub-admins fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sub-admins" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: subAdmins });
  } catch (err) {
    console.error("Sub-admins fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/sub-admins — Invite a new sub-admin
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, invitedBy, permissions } = body;
    // email: email of the user to promote to sub-admin (must exist in users table)
    // invitedBy: admin user id
    // permissions: array of permission keys to grant

    if (!email || !invitedBy) {
      return NextResponse.json(
        { error: "email and invitedBy are required" },
        { status: 400 }
      );
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: "At least one permission must be granted" },
        { status: 400 }
      );
    }

    // Validate permission keys against known definitions
    const invalidKeys = permissions.filter(
      (k: string) => !ALL_PERMISSION_KEYS.includes(k)
    );
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid permission keys: ${invalidKeys.join(", ")}` },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Find the user by email
    const { data: existingUser } = await (adminClient
      .from("users")
      .select("id, email, role")
      .eq("email", email)
      .maybeSingle() as never) as unknown as { data: { id: string; email: string | null; role: string } | null };

    if (!existingUser) {
      return NextResponse.json(
        { error: "No user found with this email. The user must first sign up on the platform." },
        { status: 404 }
      );
    }

    // Check if already a sub-admin or admin
    if (existingUser.role === "admin") {
      return NextResponse.json(
        { error: "This user is already a full admin" },
        { status: 409 }
      );
    }

    // Check if already invited as sub-admin
    const { data: existingSubAdmin } = await (adminClient
      .from("sub_admins")
      .select("id, status")
      .eq("user_id", (existingUser as unknown as { id: string }).id)
      .maybeSingle() as never) as unknown as { data: { id: string; status: string } | null };

    if (existingSubAdmin) {
      if (existingSubAdmin.status === "revoked") {
        // Re-invite: update status back to invited
        const { data: updated, error: updateError } = await (adminClient
          .from("sub_admins")
          .update({ status: "invited" } as never)
          .eq("id", (existingSubAdmin as unknown as { id: string }).id)
          .select()
          .single() as never) as unknown as { data: { id: string } | null; error: any };

        if (updateError) {
          console.error("Sub-admin re-invite error:", updateError);
          return NextResponse.json(
            { error: "Failed to re-invite sub-admin" },
            { status: 500 }
          );
        }

        // Update permissions
        await adminClient
      .from("sub_admin_permissions")
      .delete()
      .eq("sub_admin_id", (existingSubAdmin as unknown as { id: string }).id);

        const permInserts = permissions.map((key: string) => ({
          sub_admin_id: (existingSubAdmin as unknown as { id: string }).id,
          permission_key: key,
          granted: true,
        }));

        const { error: permError } = await adminClient
          .from("sub_admin_permissions")
          .insert(permInserts as never);

        if (permError) {
          console.error("Sub-admin permissions insert error:", permError);
        }

        // Audit log
        await adminClient.from("admin_audit_log").insert({
          admin_user_id: invitedBy,
          action: "sub_admin_reinvited",
          target_id: (updated as unknown as { id: string }).id,
          new_value: { status: "invited", permissions, user_email: email },
        } as never);

        return NextResponse.json({
          success: true,
          message: "Sub-admin re-invited successfully",
          data: updated,
        });
      }

      return NextResponse.json(
        { error: `This user is already a sub-admin (status: ${existingSubAdmin.status})` },
        { status: 409 }
      );
    }

    // Update the user's role to sub_admin
    const { error: roleUpdateError } = await adminClient
      .from("users")
      .update({ role: "sub_admin" } as never)
      .eq("id", existingUser.id);

    if (roleUpdateError) {
      console.error("User role update error:", roleUpdateError);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }

    // Create sub-admin record
    const { data: newSubAdmin, error: subAdminError } = await adminClient
      .from("sub_admins")
      .insert({
        user_id: existingUser.id,
        invited_by: invitedBy,
        status: "invited",
      } as never)
      .select()
      .single();

    if (subAdminError) {
      console.error("Sub-admin creation error:", subAdminError);
      // Rollback role change
      await adminClient
        .from("users")
        .update({ role: existingUser.role } as never)
        .eq("id", existingUser.id);
      return NextResponse.json(
        { error: "Failed to create sub-admin" },
        { status: 500 }
      );
    }

    // Grant permissions
    const permInserts = permissions.map((key: string) => ({
      sub_admin_id: (newSubAdmin as unknown as { id: string }).id,
      permission_key: key,
      granted: true,
    }));

    const { error: permError } = await adminClient
      .from("sub_admin_permissions")
      .insert(permInserts as never);

    if (permError) {
      console.error("Sub-admin permissions insert error:", permError);
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: invitedBy,
      action: "sub_admin_invited",
      target_id: (newSubAdmin as unknown as { id: string }).id,
      new_value: { status: "invited", permissions, user_email: email },
    } as never);

    return NextResponse.json({
      success: true,
      message: "Sub-admin invited successfully",
      data: newSubAdmin,
    });
  } catch (err) {
    console.error("Sub-admin invite error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/sub-admins — Update sub-admin status or permissions
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { subAdminId, action, adminUserId, permissions } = body;
    // action: "activate" | "revoke" | "update_permissions"
    // permissions: array of permission keys (for update_permissions action)

    if (!subAdminId || !action || !adminUserId) {
      return NextResponse.json(
        { error: "subAdminId, action, and adminUserId are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch current sub-admin for audit logging
    const { data: existing } = await adminClient
      .from("sub_admins")
      .select("*, users!inner(id, email, role)")
      .eq("id", subAdminId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Sub-admin not found" },
        { status: 404 }
      );
    }

    const subAdmin = existing as unknown as {
      id: string;
      user_id: string;
      status: string;
      users: { id: string; email: string | null; role: string };
    };

    if (action === "activate") {
      if (subAdmin.status === "active") {
        return NextResponse.json(
          { error: "Sub-admin is already active" },
          { status: 409 }
        );
      }

      const { data, error } = await adminClient
        .from("sub_admins")
        .update({ status: "active" } as never)
        .eq("id", subAdminId)
        .select()
        .single();

      if (error) {
        console.error("Sub-admin activate error:", error);
        return NextResponse.json(
          { error: "Failed to activate sub-admin" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "sub_admin_activated",
        target_id: subAdminId,
        old_value: { status: subAdmin.status },
        new_value: { status: "active" },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Sub-admin activated",
        data,
      });
    }

    if (action === "revoke") {
      if (subAdmin.status === "revoked") {
        return NextResponse.json(
          { error: "Sub-admin is already revoked" },
          { status: 409 }
        );
      }

      const { data, error } = await adminClient
        .from("sub_admins")
        .update({ status: "revoked" } as never)
        .eq("id", subAdminId)
        .select()
        .single();

      if (error) {
        console.error("Sub-admin revoke error:", error);
        return NextResponse.json(
          { error: "Failed to revoke sub-admin" },
          { status: 500 }
        );
      }

      // Update the user's role back to their original role (or buyer)
      await adminClient
        .from("users")
        .update({ role: "buyer" } as never)
        .eq("id", subAdmin.user_id);

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "sub_admin_revoked",
        target_id: subAdminId,
        old_value: { status: subAdmin.status },
        new_value: { status: "revoked" },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Sub-admin revoked",
        data,
      });
    }

    if (action === "update_permissions") {
      if (!permissions || !Array.isArray(permissions)) {
        return NextResponse.json(
          { error: "permissions array is required" },
          { status: 400 }
        );
      }

      // Delete all existing permissions
      await adminClient
        .from("sub_admin_permissions")
        .delete()
        .eq("sub_admin_id", subAdminId);

      // Insert new permissions
      const permInserts = permissions.map((key: string) => ({
        sub_admin_id: subAdminId,
        permission_key: key,
        granted: true,
      }));

      const { error: permError } = await adminClient
        .from("sub_admin_permissions")
        .insert(permInserts as never);

      if (permError) {
        console.error("Permissions update error:", permError);
        return NextResponse.json(
          { error: "Failed to update permissions" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "sub_admin_permissions_updated",
        target_id: subAdminId,
        new_value: { permissions },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Permissions updated",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: activate, revoke, update_permissions" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Sub-admin update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
