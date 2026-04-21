"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pending: { text: "대기", color: "text-yellow-600" },
  approved: { text: "승인", color: "text-green-600" },
  rejected: { text: "거부", color: "text-red-600" },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError("관리자만 접근할 수 있습니다.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("사용자 목록을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users);
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
      alert("상태 변경에 실패했습니다.");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status } : u))
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">불러오는 중...</p>
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
      <h1 className="text-2xl font-bold mb-6">사용자 관리</h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3">
          승인 대기 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-500">승인 대기 중인 사용자가 없습니다.</p>
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
                    {new Date(user.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateStatus(user.id, "approved")}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => updateStatus(user.id, "rejected")}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">전체 사용자</h2>
        {others.length === 0 ? (
          <p className="text-gray-500">아직 처리된 사용자가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {others.map((user) => {
              const s = statusLabel[user.status];
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
                    {user.status === "approved" ? (
                      <button
                        onClick={() => updateStatus(user.id, "rejected")}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        거부로 변경
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(user.id, "approved")}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        승인으로 변경
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
