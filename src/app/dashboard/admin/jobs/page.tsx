"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Eye,
  RefreshCw,
  Mail,
  Phone,
  User,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_interest: string;
  pitch: string | null;
  status: "pending" | "reviewed" | "invited" | "rejected";
  reviewed_by: string | null;
  created_at: string;
}

type StatusTab = "pending" | "reviewed" | "invited" | "rejected" | "all";

const ROLE_LABELS: Record<string, string> = {
  community: "Community & Vendor Success Manager",
  content: "Content & Social Media Associate",
  developer: "Junior Full-Stack Developer",
  qa: "Quality Assurance Associate",
  other: "Other / Not listed",
};

export default function AdminJobsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingApps(true);
      const res = await fetch(`/api/admin/jobs?status=${statusFilter}`);
      const result = await res.json();
      if (result.success) {
        setApplications(result.data);
      } else {
        toast.error("Failed to load applications");
      }
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoadingApps(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchApplications();
    }
  }, [user, role, fetchApplications]);

  const handleAction = async (
    applicationId: string,
    action: "reviewed" | "invited" | "rejected"
  ) => {
    setActionLoading(applicationId);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action,
          adminUserId: user?.id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          action === "reviewed"
            ? "Marked as reviewed"
            : action === "invited"
              ? "Applicant invited"
              : "Application rejected"
        );
        fetchApplications();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApps = applications.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.role_interest && a.role_interest.toLowerCase().includes(q))
    );
  });

  const tabs: { key: StatusTab; label: string; icon: typeof Eye }[] = [
    { key: "pending", label: "Pending", icon: Eye },
    { key: "reviewed", label: "Reviewed", icon: CheckCircle },
    { key: "invited", label: "Invited", icon: User },
    { key: "rejected", label: "Rejected", icon: XCircle },
    { key: "all", label: "All", icon: FileText },
  ];

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/dashboard/admin" className="text-gray-400 hover:text-brand-navy transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">Job Applications</h1>
                </div>
                <p className="text-gray-500">Review &quot;Work With Us&quot; submissions</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchApplications}>
                <RefreshCw className={`h-4 w-4 ${loadingApps ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  variant={statusFilter === tab.key ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(tab.key)}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
              />
            </div>

            {loadingApps ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-brand-navy mb-1">No applications found</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApps.map((app) => (
                  <div key={app.id} className="glass rounded-2xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-brand-navy" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-brand-navy">{app.full_name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{app.email}</span>
                              {app.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.phone}</span>}
                              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{ROLE_LABELS[app.role_interest] || app.role_interest}</span>
                            </div>
                          </div>
                        </div>
                        {app.pitch && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-xl p-3">{app.pitch}</p>}
                      </div>
                      <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          app.status === "pending" ? "bg-accent-warning/10 text-accent-warning" :
                          app.status === "reviewed" ? "bg-accent-info/10 text-accent-info" :
                          app.status === "invited" ? "bg-accent-success/10 text-accent-success" :
                          "bg-gray-100 text-gray-500"
                        }`}>{app.status}</span>
                        {app.status === "pending" && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleAction(app.id, "reviewed")} disabled={actionLoading === app.id}>
                              {actionLoading === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              Review
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => handleAction(app.id, "invited")} disabled={actionLoading === app.id}>
                              <User className="h-4 w-4" />Invite
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleAction(app.id, "rejected")} disabled={actionLoading === app.id}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
