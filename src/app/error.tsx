"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex items-center justify-center pt-20">
        <div className="text-center px-4">
          <div className="w-20 h-20 rounded-2xl bg-accent-error/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-accent-error" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-4">
            Something Went Wrong
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            We encountered an unexpected error. Our team has been notified.
            Please try again.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="primary" size="lg" onClick={reset}>
              Try Again
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
