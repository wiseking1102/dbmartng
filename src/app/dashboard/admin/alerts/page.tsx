"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Shield,
  RefreshCw,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";

type AlertSeverity = "info" | "warning" | "critical";

interface SystemAlert {
  id: string;
  source: string;
  error_detail: string | null;
  severity: AlertSeverity;
  resolved_at: string | null;
  occurred_at: string;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; icon: any }> = {
  info: {
    label: "Info",
    color: "text-accent-info bg-accent-info/10 border-accent-info/20",
    icon: Info,
  },
  warning: {
    label: "Warning",
    color: "text-accent-warning bg-accent-warning/10 border-accent-warning/20",
    icon: AlertTriangle,
  },
  critical: {
    label: "Critical",
    color: "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: AlertCircle,
  },
};

const SOURCE_LABELS: Record<string, string> = {
  gemini: "Gemini AI",
  paystack: "Paystack",
  supabase: "Supabase Database",
  email: "Email Delivery",
  ad_network: "Ad Network",
  uptime: "Uptime Monitor",
  system: "System",
};

export default function SystemAlertsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("open");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/admin/alerts?${params}`);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Failed to fetch alerts");
      setAlerts(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => {
    if (user) fetchAlerts();
  }, [user, fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to resolve alert");
      fetchAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = severityFilter === "all" || a.severity === severityFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "open" && !a.resolved_at) ||
      (statusFilter === "resolved" && a.resolved_at);
    return matchesSeverity && matchesStatus;
  });

  const openCount = alerts.filter((a) => !a.resolved_at).length;
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && !a.resolved_at
  ).length;

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
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
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard/admin"
              className="text-gray-400 hover:text-brand-navy"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  System Alerts
                </h1>
                <div className="flex items-center gap-2">
                  {openCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-warning/10 text-accent-warning text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      {openCount} open
                    </span>
                  )}
                  {criticalCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-error/10 text-accent-error text-xs font-semibold">
                      <AlertCircle className="h-3 w-3" />
                      {criticalCount} critical
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Monitor system health and integration status
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAlerts}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Severity filter */}
              <div className="flex flex-wrap gap-2">
                {(["all", "critical", "warning", "info"] as const).map(
                  (severity) => (
                    <button
                      key={severity}
                      onClick={() => setSeverityFilter(severity)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        severityFilter === severity
                          ? "bg-brand-navy text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {severity === "all"
                        ? "All"
                        : severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </button>
                  )
                )}
              </div>

              {/* Status filter */}
              <div className="flex flex-wrap gap-2">
                {(["open", "resolved", "all"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      statusFilter === status
                        ? "bg-brand-navy text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {status === "all"
                      ? "All"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts List */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2">
                All Clear
              </h3>
              <p className="text-gray-500">
                {severityFilter !== "all" || statusFilter !== "all"
                  ? "No alerts match your filters."
                  : "No system alerts. Everything is running smoothly."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const config = SEVERITY_CONFIG[alert.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "glass rounded-2xl p-5 transition-shadow hover:shadow-md",
                      !alert.resolved_at && alert.severity === "critical"
                        ? "border-l-4 border-accent-error"
                        : !alert.resolved_at && alert.severity === "warning"
                          ? "border-l-4 border-accent-warning"
                          : ""
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Severity Icon */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          config.color.replace("text-", "bg-").replace("/10", "/10")
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.color.split(" ")[0])} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-brand-navy">
                                {SOURCE_LABELS[alert.source] || alert.source}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                  config.color
                                )}
                              >
                                {config.label}
                              </span>
                              {alert.resolved_at && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-success/10 text-accent-success text-[10px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Resolved
                                </span>
                              )}
                            </div>
                            {alert.error_detail && (
                              <p className="text-sm text-gray-600 font-mono text-xs">
                                {alert.error_detail}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          {!alert.resolved_at && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-accent-success hover:bg-accent-success/5 transition-all"
                              title="Mark as resolved"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Occurred:{" "}
                            {new Date(alert.occurred_at).toLocaleString("en-NG")}
                          </span>
                          {alert.resolved_at && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved:{" "}
                              {new Date(alert.resolved_at).toLocaleString("en-NG")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
