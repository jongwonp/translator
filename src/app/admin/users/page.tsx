"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageContext";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [myId, setMyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: t.admin.statusPending, color: "text-yellow-600" },
    approved: { text: t.admin.statusApproved, color: "text-green-600" },
    rejected: { text: t.admin.statusRejected, color: "text-red-600" },
  };

  const fetchUsers = async () => {
    const [usersRes, meRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/auth/me"),
    ]);
    if (usersRes.status === 401) {
      router.push("/login");
      return;
    }
    if (usersRes.status === 403) {
      setError(t.admin.adminOnly);
      setLoading(false);
      return;
    }
    if (!usersRes.ok) {
      setError(t.admin.fetchFailed);
      setLoading(false);
      return;
    }
    const data = await usersRes.json();
    setUsers(data.users);
    if (meRes.ok) {
      const me = await meRes.json();
      setMyId(me.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateStatus = async (
    id: number,
    status: "approved" | "rejected"
  ) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      alert(t.admin.updateFailed);
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status } : u))
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">{t.admin.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{t.admin.title}</h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">
          {t.admin.pendingSectionTitle(pending.length)}
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-500">{t.admin.pendingEmpty}</p>
        ) : (
          <div className="space-y-3">
            {pending.map((user) => (
              <div
                key={user.id}
                className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(user.createdAt).toLocaleString(language)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateStatus(user.id, "approved")}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t.admin.approve}
                  </button>
                  <button
                    onClick={() => updateStatus(user.id, "rejected")}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    {t.admin.reject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">{t.admin.allUsersTitle}</h2>
        {others.length === 0 ? (
          <p className="text-gray-500">{t.admin.allUsersEmpty}</p>
        ) : (
          <div className="space-y-3">
            {others.map((user) => {
              const s = statusLabel[user.status];
              const isSelf = user.id === myId;
              return (
                <div
                  key={user.id}
                  className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-medium ${s.color}`}>
                      {s.text}
                    </span>
                    {isSelf ? (
                      <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md">
                        {t.admin.adminBadge}
                      </span>
                    ) : user.status === "approved" ? (
                      <button
                        onClick={() => updateStatus(user.id, "rejected")}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        {t.admin.changeToRejected}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(user.id, "approved")}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {t.admin.changeToApproved}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
