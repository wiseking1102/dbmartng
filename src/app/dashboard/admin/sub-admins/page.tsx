"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Ban,
  UserCheck,
  Mail,
  Clock,
  Settings2,
  Users,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { PERMISSION_CATEGORIES } from "@/lib/permissions";

interface SubAdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface InvitedByUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface SubAdminPermission {
  id: string;
  permission_key: string;
  granted: boolean;
}

interface SubAdmin {
  id: string;
  user_id: string;
  invited_by: string;
  status: "invited" | "active" | "revoked";
  created_at: string;
  users: SubAdminUser;
  invited_by_user: InvitedByUser;
  sub_admin_permissions: SubAdminPermission[];
}

export default function AdminSubAdminsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loadingSubAdmins, setLoadingSubAdmins] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());

  const fetchSubAdmins = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingSubAdmins(true);
      const res = await fetch("/api/admin/sub-admins");
      const result = await res.json();
      if (result.success) {
        setSubAdmins(result.data);
      } else {
        toast.error("Failed to load sub-admins");
      }
    } catch {
      toast.error("Failed to load sub-admins");
    } finally {
      setLoadingSubAdmins(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchSubAdmins();
    }
  }, [user, role, fetchSubAdmins]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (selectedPermissions.size === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/sub-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          invitedBy: user?.id,
          permissions: Array.from(selectedPermissions),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Sub-admin invited successfully");
        setShowInviteModal(false);
        setInviteEmail("");
        setSelectedPermissions(new Set());
        fetchSubAdmins();
      } else {
        toast.error(result.error || "Failed to invite sub-admin");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAction = async (
    subAdminId: string,
    action: "activate" | "revoke"
  ) => {
    setActionLoading(subAdminId);
    try {
      const res = await fetch("/api/admin/sub-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subAdminId,
          action,
          adminUserId: user?.id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          action === "activate"
            ? "Sub-admin activated"
            : "Sub-admin revoked"
        );
        fetchSubAdmins();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSavePermissions = async (subAdminId: string) => {
    setActionLoading(subAdminId);
    try {
      const res = await fetch("/api/admin/sub-admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subAdminId,
          action: "update_permissions",
          adminUserId: user?.id,
          permissions: Array.from(editPerms),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Permissions updated");
        setEditingPermissions(null);
        fetchSubAdmins();
      } else {
        toast.error(result.error || "Failed to update permissions");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubAdmins = subAdmins.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.users?.email?.toLowerCase().includes(q) ||
      s.users?.full_name?.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
    );
  });

  const togglePermission = (key: string, set: Set<string>, updateFn: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    updateFn(newSet);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "bg-accent-success/10", text: "text-accent-success", icon: CheckCircle, label: "Active" };
      case "invited":
        return { bg: "bg-accent-info/10", text: "text-accent-info", icon: Clock, label: "Invited" };
      case "revoked":
        return { bg: "bg-accent-error/10", text: "text-accent-error", icon: XCircle, label: "Revoked" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-500", icon: Clock, label: status };
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">
            Loading admin panel...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard/admin"
                  className="text-gray-400 hover:text-brand-navy transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Sub-Admin Management
                </h1>
              </div>
              <p className="text-gray-500">
                Invite, manage permissions, and revoke sub-admin accounts
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSubAdmins}>
                <RefreshCw className={`h-4 w-4 ${loadingSubAdmins ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)}>
                <UserPlus className="h-4 w-4" />
                Invite Sub-Admin
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-brand-navy" />
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <div className="text-2xl font-bold text-brand-navy">{subAdmins.length}</div>
              <div className="text-xs text-gray-500">Sub-admins</div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="h-5 w-5 text-accent-success" />
                <span className="text-xs text-gray-400">Active</span>
              </div>
              <div className="text-2xl font-bold text-accent-success">
                {subAdmins.filter((s) => s.status === "active").length}
              </div>
              <div className="text-xs text-gray-500">Currently active</div>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Ban className="h-5 w-5 text-accent-error" />
                <span className="text-xs text-gray-400">Revoked</span>
              </div>
              <div className="text-2xl font-bold text-accent-error">
                {subAdmins.filter((s) => s.status === "revoked").length}
              </div>
              <div className="text-xs text-gray-500">Revoked access</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
            />
          </div>

          {/* Sub-Admin List */}
          {loadingSubAdmins ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
            </div>
          ) : filteredSubAdmins.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy mb-1">
                No sub-admins found
              </h3>
              <p className="text-gray-500">
                Invite team members to help manage the platform.
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="h-4 w-4" />
                Invite Your First Sub-Admin
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubAdmins.map((sub) => {
                const statusBadge = getStatusBadge(sub.status);
                const BadgeIcon = statusBadge.icon;
                const currentPerms = new Set(
                  sub.sub_admin_permissions
                    ?.filter((p) => p.granted)
                    .map((p) => p.permission_key) || []
                );

                return (
                  <div
                    key={sub.id}
                    className={`glass rounded-2xl p-6 hover:shadow-md transition-shadow border-l-4 ${
                      sub.status === "active"
                        ? "border-l-accent-success"
                        : sub.status === "invited"
                          ? "border-l-accent-info"
                          : "border-l-accent-error"
                    }`}
                  >
                    {/* Row 1: User Info + Status + Actions */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            sub.status === "active"
                              ? "bg-accent-success/10"
                              : sub.status === "invited"
                                ? "bg-accent-info/10"
                                : "bg-accent-error/10"
                          }`}
                        >
                          <Shield
                            className={`h-6 w-6 ${
                              sub.status === "active"
                                ? "text-accent-success"
                                : sub.status === "invited"
                                  ? "text-accent-info"
                                  : "text-accent-error"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-brand-navy truncate">
                            {sub.users?.full_name || "Unnamed User"}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {sub.users?.email || "No email"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Invited by {sub.invited_by_user?.full_name || sub.invited_by_user?.email || "Unknown"}{" "}
                            &middot;{" "}
                            {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}
                        >
                          <BadgeIcon className="h-3.5 w-3.5" />
                          {statusBadge.label}
                        </div>

                        {sub.status === "invited" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAction(sub.id, "activate")}
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            Activate
                          </Button>
                        )}
                        {sub.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-accent-error border-accent-error/30 hover:bg-accent-error/5"
                            onClick={() => handleAction(sub.id, "revoke")}
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                            Revoke
                          </Button>
                        )}
                        {sub.status === "revoked" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAction(sub.id, "activate")}
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            Re-activate
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Permissions */}
                    {editingPermissions === sub.id ? (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <h4 className="text-sm font-semibold text-brand-navy mb-3">
                          Edit Permissions
                        </h4>
                        {PERMISSION_CATEGORIES.map((group) => (
                          <div key={group.category} className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              {group.category}
                            </h5>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {group.permissions.map((perm) => (
                                <label
                                  key={perm.key}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                                    editPerms.has(perm.key)
                                      ? "border-brand-gold bg-brand-gold/5"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editPerms.has(perm.key)}
                                    onChange={() =>
                                      togglePermission(
                                        perm.key,
                                        editPerms,
                                        setEditPerms
                                      )
                                    }
                                    className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-brand-navy truncate">
                                      {perm.label}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate">
                                      {perm.description}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 justify-end mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPermissions(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSavePermissions(sub.id)}
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Save Permissions
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-brand-navy">
                            Permissions ({currentPerms.size})
                          </h4>
                          {sub.status !== "revoked" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPermissions(sub.id);
                                setEditPerms(new Set(currentPerms));
                              }}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                        {currentPerms.size > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(currentPerms).map((key) => {
                              const def = PERMISSION_CATEGORIES.flatMap(
                                (g) => g.permissions
                              ).find((p) => p.key === key);
                              return (
                                <span
                                  key={key}
                                  className="px-2.5 py-1 bg-brand-navy/5 rounded-full text-xs text-brand-navy font-medium"
                                >
                                  {def?.label || key}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            No permissions granted
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
              <div className="bg-white rounded-2xl p-6 max-w-xl w-full mx-4 shadow-xl">
                <h3 className="font-bold text-brand-navy text-lg mb-1">
                  Invite Sub-Admin
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Enter the email of an existing platform user. They must have already signed
                  up on DBMartNG.
                </p>

                {/* Email Input */}
                <label className="block text-sm font-medium text-brand-navy mb-1.5">
                  User Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. team@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold mb-6"
                />

                {/* Permissions */}
                <label className="block text-sm font-medium text-brand-navy mb-3">
                  Grant Permissions
                </label>
                {PERMISSION_CATEGORIES.map((group) => (
                  <div key={group.category} className="mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {group.category}
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {group.permissions.map((perm) => {
                        const isSelected = selectedPermissions.has(perm.key);
                        return (
                          <button
                            key={perm.key}
                            onClick={() =>
                              togglePermission(
                                perm.key,
                                selectedPermissions,
                                setSelectedPermissions
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                              isSelected
                                ? "border-brand-gold bg-brand-gold/10 text-brand-navy"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                            title={perm.description}
                          >
                            {perm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail("");
                      setSelectedPermissions(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim() || selectedPermissions.size === 0}
                  >
                    {inviteLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Send Invite
                  </Button>
                </div>
              </div>
            </div>
          )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
