"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  User as UserIcon,
  Link2,
  Trash2,
  CheckCircle,
  Ban,
  Key,
} from "lucide-react";
import { I18N, Lang } from "@/lib/i18n";
import { Badge, Button } from "@/components/ui/primitives";
import { AssignAccountsModal } from "./assign-accounts-modal";

export interface BackofficeUser {
  id: number;
  username: string;
  display_name: string;
  role: "superadmin" | "tenant";
  status: "active" | "suspended";
  assigned_accounts: string[];
  last_login_at: string | null;
  created_at: string;
}

interface AccountOption {
  username: string;
  display_name: string;
  avatar_url: string;
}

interface UserTableProps {
  users: BackofficeUser[];
  availableAccounts: AccountOption[];
  currentUserId: number;
  lang: Lang;
  onRefresh: () => void;
}

export function UserTable({
  users,
  availableAccounts,
  currentUserId,
  lang,
  onRefresh,
}: UserTableProps) {
  const t = (key: string) => I18N[lang]?.[key] || I18N.fa[key] || key;

  const [selectedUserForAssign, setSelectedUserForAssign] =
    useState<BackofficeUser | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Toggle user status (active / suspended)
  const handleToggleStatus = async (user: BackofficeUser) => {
    setActionError(null);
    const nextStatus = user.status === "active" ? "suspended" : "active";

    setLoadingId(user.id);
    try {
      const res = await fetch(`/api/backoffice/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || "Failed to update status");
      } else {
        onRefresh();
      }
    } catch {
      setActionError("Network error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  // Reset password prompt
  const handleResetPassword = async (user: BackofficeUser) => {
    setActionError(null);
    const newPass = window.prompt(
      `رمز عبور جدید برای کاربر @${user.username} را وارد کنید (حداقل ۶ کاراکتر):`
    );
    if (!newPass) return;
    if (newPass.length < 6) {
      alert("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }

    setLoadingId(user.id);
    try {
      const res = await fetch(`/api/backoffice/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPass }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || "Failed to reset password");
      } else {
        alert("رمز عبور با موفقیت بروزرسانی شد");
      }
    } catch {
      setActionError("Network error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: BackofficeUser) => {
    if (
      !window.confirm(
        `آیا از حذف کاربر @${user.username} اطمینان دارید؟ این عملیات قابل بازگشت نیست.`
      )
    ) {
      return;
    }

    setActionError(null);
    setLoadingId(user.id);
    try {
      const res = await fetch(`/api/backoffice/users/${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || "Failed to delete user");
      } else {
        onRefresh();
      }
    } catch {
      setActionError("Network error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs">
          {actionError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-medium">
              <th className="py-3.5 px-4 text-start">{t("usernameLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("displayNameLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("roleLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("statusLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("assignAccountsBtn")}</th>
              <th className="py-3.5 px-4 text-end">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isSuperadmin = user.role === "superadmin";

              return (
                <tr
                  key={user.id}
                  className="hover:bg-secondary/40 transition-colors"
                >
                  {/* Username */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-foreground">
                        {user.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-mono text-foreground font-medium flex items-center gap-1.5">
                          <span>@{user.username}</span>
                          {isSelf && (
                            <Badge variant="purple" className="text-[10px] py-0 px-1.5">
                              شما
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ID: #{user.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Display Name */}
                  <td className="py-3.5 px-4 text-foreground/90">
                    {user.display_name || user.username}
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    {isSuperadmin ? (
                      <Badge variant="purple">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{t("roleSuperadmin")}</span>
                      </Badge>
                    ) : (
                      <Badge variant="sky">
                        <UserIcon className="w-3 h-3" />
                        <span>{t("roleTenant")}</span>
                      </Badge>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {user.status === "active" ? (
                      <Badge variant="emerald">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t("userStatusActive")}</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <Ban className="w-3 h-3" />
                        <span>{t("userStatusSuspended")}</span>
                      </Badge>
                    )}
                  </td>

                  {/* Assigned Accounts */}
                  <td className="py-3.5 px-4">
                    {isSuperadmin ? (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        دسترسی به تمام پیج‌ها
                      </span>
                    ) : user.assigned_accounts.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.assigned_accounts.map((acc) => (
                          <span
                            key={acc}
                            className="inline-block px-1.5 py-0.5 rounded bg-secondary border border-border text-[11px] font-mono text-foreground"
                          >
                            @{acc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        {t("noAssignedAccounts")}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-end">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Assign Accounts Button */}
                      {!isSuperadmin && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => setSelectedUserForAssign(user)}
                          title={t("assignAccountsBtn")}
                          className="h-7 w-7"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Reset Password Button */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => handleResetPassword(user)}
                        title="تغییر رمز عبور"
                        className="h-7 w-7"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </Button>

                      {/* Toggle Status Button */}
                      {!isSelf && (
                        <Button
                          type="button"
                          variant={user.status === "active" ? "outline" : "emerald"}
                          size="icon"
                          disabled={loadingId === user.id}
                          onClick={() => handleToggleStatus(user)}
                          title={
                            user.status === "active"
                              ? "تعلیق کاربر"
                              : "فعال‌سازی مجدد کاربر"
                          }
                          className="h-7 w-7"
                        >
                          {user.status === "active" ? (
                            <Ban className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}

                      {/* Delete Button */}
                      {!isSelf && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          disabled={loadingId === user.id}
                          onClick={() => handleDeleteUser(user)}
                          title={t("deleteUserBtn")}
                          className="h-7 w-7"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedUserForAssign && (
        <AssignAccountsModal
          user={selectedUserForAssign}
          availableAccounts={availableAccounts}
          lang={lang}
          onClose={() => setSelectedUserForAssign(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
