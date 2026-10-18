import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-guard";
import { hashPassword, nowTimestamp, UserRow } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    if (sessionUser.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Superadmin role required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: "شناسه کاربر نامعتبر است" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(targetUserId) as UserRow | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const now = nowTimestamp();

    // Protection against locking out the only superadmin
    if (existing.role === "superadmin") {
      const superadminCount = db
        .prepare(
          "SELECT COUNT(*) as count FROM users WHERE role = 'superadmin' AND status = 'active'"
        )
        .get() as { count: number };

      if (superadminCount.count <= 1) {
        if (body.status === "suspended" || body.role === "tenant") {
          return NextResponse.json(
            {
              success: false,
              error: "امکان تعلیق یا خلع دسترسی تنها مدیر ارشد سامانه وجود ندارد",
            },
            { status: 400 }
          );
        }
      }
    }

    const newDisplayName =
      body.display_name !== undefined
        ? String(body.display_name).trim()
        : existing.display_name;

    const newStatus =
      body.status === "suspended" || body.status === "active"
        ? body.status
        : existing.status;

    const newRole =
      body.role === "superadmin" || body.role === "tenant"
        ? body.role
        : existing.role;

    let newPasswordHash = existing.password_hash;
    if (body.password && typeof body.password === "string" && body.password.length >= 6) {
      newPasswordHash = hashPassword(body.password);
    }

    db.prepare(`
      UPDATE users SET
        display_name = ?,
        status = ?,
        role = ?,
        password_hash = ?,
        updated_at = ?
      WHERE id = ?
    `).run(newDisplayName, newStatus, newRole, newPasswordHash, now, targetUserId);

    // If suspended or password changed, revoke all current sessions immediately!
    if (newStatus === "suspended" || body.password) {
      db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(targetUserId);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: targetUserId,
        username: existing.username,
        display_name: newDisplayName,
        role: newRole,
        status: newStatus,
        updated_at: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    if (sessionUser.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Superadmin role required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: "شناسه کاربر نامعتبر است" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(targetUserId) as UserRow | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    // Protection against deleting the only superadmin or self-deletion
    if (existing.role === "superadmin") {
      const superadminCount = db
        .prepare(
          "SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'"
        )
        .get() as { count: number };

      if (superadminCount.count <= 1 || existing.id === sessionUser.id) {
        return NextResponse.json(
          {
            success: false,
            error: "امکان حذف حساب کاربری خود یا تنها مدیر ارشد سامانه وجود ندارد",
          },
          { status: 400 }
        );
      }
    }

    // Delete user (foreign keys with ON DELETE CASCADE will clean up user_sessions and user_accounts)
    db.prepare("DELETE FROM users WHERE id = ?").run(targetUserId);

    return NextResponse.json({
      success: true,
      message: "کاربر با موفقیت حذف شد",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
