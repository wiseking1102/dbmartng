import { PageTransitionProvider } from "@/lib/motion/PageTransitionContext";

/**
 * Shared dashboard layout that provides consistent page-transition
 * animations across all dashboard sub-routes (admin, buyer, vendor).
 *
 * Auth protection is handled by middleware.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransitionProvider>{children}</PageTransitionProvider>;
}
