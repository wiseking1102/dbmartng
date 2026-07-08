import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferralShareCard } from "./ReferralShareCard";
import { toast } from "sonner"; // static import resolves to mocked module

// Mock lucide-react to avoid ESM resolution issues
vi.mock("lucide-react", () => ({
  Share2: () => <div data-testid="icon-share2" />,
  Copy: () => <div data-testid="icon-copy" />,
  Check: () => <div data-testid="icon-check" />,
  ExternalLink: () => <div data-testid="icon-external" />,
  Gift: () => <div data-testid="icon-gift" />,
  Loader2: ({ role }: { role?: string }) => (
    <div data-testid="icon-loader" role={role} />
  ),
}));

// Mock sonner toast (inline factory only - no hoisting issue)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock clipboard (store reference for assertions) and wire to navigator
const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: clipboardWriteText },
  writable: true,
  configurable: true,
});

// Mock window.open
const mockOpen = vi.fn();
vi.stubGlobal("open", mockOpen);

const buyerStats = {
  total: 10,
  converted: 6,
  pending: 2,
  rewarded: 4,
};

const vendorStats = {
  total: 5,
  converted: 3,
  rewarded: 2,
};

describe("ReferralShareCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: successful fetch returning a code
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, code: "ABC123" }),
    });
  });

  // Reset clipboard implementation before each test
  beforeEach(() => {
    clipboardWriteText.mockResolvedValue(undefined);
  });

  describe("buyer variant", () => {
    it("renders the share card with buyer reward text", async () => {
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      expect(screen.getByText("Share Your Referral Link")).toBeInTheDocument();
      expect(
        screen.getByText("Earn ₦1,000 per friend who signs up")
      ).toBeInTheDocument();
    });

    it("fetches referral code on mount", async () => {
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", referrer_type: "buyer" }),
        });
      });
    });

    it("shows the referral code badge after fetch resolves", async () => {
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      await waitFor(() => {
        expect(screen.getByText("ABC123")).toBeInTheDocument();
      });
    });

    it("shows stats grid with pending column", async () => {
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      await waitFor(() => {
        expect(screen.getByText("10")).toBeInTheDocument();
      });
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  describe("vendor variant", () => {
    it("renders with vendor reward text", async () => {
      render(
        <ReferralShareCard
          referrerType="vendor"
          stats={vendorStats}
          showPending={false}
        />
      );

      expect(
        screen.getByText(
          "Get 1 month free Pro per referred vendor who subscribes"
        )
      ).toBeInTheDocument();
    });

    it("fetches with vendor referrer type", async () => {
      render(
        <ReferralShareCard
          referrerType="vendor"
          stats={vendorStats}
          showPending={false}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate",
            referrer_type: "vendor",
          }),
        });
      });
    });

    it("does not show Pending column for vendors", async () => {
      render(
        <ReferralShareCard
          referrerType="vendor"
          stats={vendorStats}
          showPending={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("5")).toBeInTheDocument();
      });
      expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    });
  });

  describe("zero-state", () => {
    it("shows 'Get Your Link' button when no code is available yet", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      expect(screen.getByText("Get Your Link")).toBeInTheDocument();
    });

    it("hides stats grid when total is 0", () => {
      render(
        <ReferralShareCard
          referrerType="buyer"
          stats={{ total: 0, converted: 0, pending: 0, rewarded: 0 }}
          showPending
        />
      );

      expect(screen.queryByText("Total referred")).not.toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("copies referral link to clipboard on copy button click", async () => {
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      await waitFor(() => {
        expect(screen.getByText("ABC123")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy referral link" }));

      await waitFor(() => {
        expect(clipboardWriteText).toHaveBeenCalledWith(
          "http://localhost:3000/auth?ref=ABC123"
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Referral link copied to clipboard!"
        );
      });
    });

    it("shows error toast when clipboard fails", async () => {
      // Make clipboard throw
      clipboardWriteText.mockRejectedValue(new Error("Permission denied"));

      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      await waitFor(() => {
        expect(screen.getByText("ABC123")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy referral link" }));

      await waitFor(() => {
        expect(clipboardWriteText).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to copy link");
      });
    });
  });

  describe("WhatsApp functionality", () => {
    it("opens WhatsApp with referral link on WhatsApp button click", async () => {
      const user = userEvent.setup();
      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      await waitFor(() => {
        expect(screen.getByText("ABC123")).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: "Share on WhatsApp" })
      );

      const [url, target] = mockOpen.mock.calls[0];
      expect(target).toBe("_blank");
      expect(url).toContain("wa.me");
      expect(url).toContain("ABC123");
      expect(url).toContain("Join%20DBMartNG%20using%20my%20referral%20code");
    });

    it("uses vendor-specific WhatsApp text", async () => {
      const user = userEvent.setup();
      render(
        <ReferralShareCard
          referrerType="vendor"
          stats={vendorStats}
          showPending={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("ABC123")).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: "Share on WhatsApp" })
      );

      const [url] = mockOpen.mock.calls[0];
      expect(url).toContain("as%20a%20vendor");
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when generating code", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      // Click "Get Your Link" to trigger loading
      await userEvent.setup().click(screen.getByText("Get Your Link"));

      // "Get Your Link" button should be gone, spinner should appear
      expect(screen.queryByText("Get Your Link")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className to the container", () => {
      const { container } = render(
        <ReferralShareCard
          referrerType="buyer"
          stats={buyerStats}
          showPending
          className="mb-4"
        />
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain("mb-4");
    });
  });

  describe("fetch failure", () => {
    it("shows Get Your Link button when fetch fails", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(
        <ReferralShareCard referrerType="buyer" stats={buyerStats} showPending />
      );

      // Wait for the fetch to fail, then the button should appear
      await waitFor(() => {
        expect(screen.getByText("Get Your Link")).toBeInTheDocument();
      });
    });
  });
});
