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
        onRefresh();
      }
    } catch {
      setActionError("Network error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  // Delete user
  const handleDeleteUser = async (user: BackofficeUser) => {
    setActionError(null);
    if (!window.confirm(t("deleteConfirmBody"))) {
      return;
    }

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
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          {actionError}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#0a0a0d] shadow-xl">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.02] text-zinc-400 font-medium">
              <th className="py-3.5 px-4 text-start">{t("usernameLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("displayNameLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("roleLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("statusLabel")}</th>
              <th className="py-3.5 px-4 text-start">{t("assignAccountsBtn")}</th>
              <th className="py-3.5 px-4 text-end">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isSuperadmin = user.role === "superadmin";

              return (
                <tr
                  key={user.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Username */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-200">
                        {user.username.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-mono text-zinc-100 font-medium flex items-center gap-1.5">
                          <span>@{user.username}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              شما
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          ID: #{user.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Display Name */}
                  <td className="py-3.5 px-4 text-zinc-300">
                    {user.display_name || user.username}
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    {isSuperadmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{t("roleSuperadmin")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <UserIcon className="w-3 h-3" />
                        <span>{t("roleTenant")}</span>
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {user.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t("userStatusActive")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Ban className="w-3 h-3" />
                        <span>{t("userStatusSuspended")}</span>
                      </span>
                    )}
                  </td>

                  {/* Assigned Accounts */}
                  <td className="py-3.5 px-4">
                    {isSuperadmin ? (
                      <span className="text-[11px] text-zinc-400 font-medium">
                        دسترسی به تمام پیج‌ها
                      </span>
                    ) : user.assigned_accounts.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.assigned_accounts.map((acc) => (
                          <span
                            key={acc}
                            className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 border border-white/8 text-[11px] font-mono text-zinc-300"
                          >
                            @{acc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">
                        {t("noAssignedAccounts")}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-end">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Assign Accounts Button */}
                      {!isSuperadmin && (
                        <button
                          type="button"
                          onClick={() => setSelectedUserForAssign(user)}
                          title={t("assignAccountsBtn")}
                          className="p-1.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Reset Password Button */}
                      <button
                        type="button"
                        onClick={() => handleResetPassword(user)}
                        title="تغییر رمز عبور"
                        className="p-1.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Status Button */}
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={loadingId === user.id}
                          onClick={() => handleToggleStatus(user)}
                          title={
                            user.status === "active"
                              ? "تعلیق کاربر"
                              : "فعال‌سازی مجدد کاربر"
                          }
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            user.status === "active"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                          }`}
                        >
                          {user.status === "active" ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Delete Button */}
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={loadingId === user.id}
                          onClick={() => handleDeleteUser(user)}
                          title={t("deleteUserBtn")}
                          className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
