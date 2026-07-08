import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReferralStatsGrid } from "./ReferralStatsGrid";

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="icon-trending" />,
}));

describe("ReferralStatsGrid", () => {
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

  describe("zero-state", () => {
    it("returns null when total is 0", () => {
      const { container } = render(
        <ReferralStatsGrid stats={{ total: 0, converted: 0, rewarded: 0 }} />
      );
      expect(container.innerHTML).toBe("");
    });

    it("returns null when all stats are 0", () => {
      const { container } = render(
        <ReferralStatsGrid
          stats={{ total: 0, converted: 0, pending: 0, rewarded: 0 }}
        />
      );
      expect(container.innerHTML).toBe("");
    });
  });

  describe("4-column layout (buyer)", () => {
    it("renders all four stat values", () => {
      render(<ReferralStatsGrid stats={buyerStats} showPending />);
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("renders all four labels", () => {
      render(<ReferralStatsGrid stats={buyerStats} showPending />);
      expect(screen.getByText("Total referred")).toBeInTheDocument();
      expect(screen.getByText("Converted")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Rewards earned")).toBeInTheDocument();
    });

    it("renders with grid-cols-4 class", () => {
      const { container } = render(
        <ReferralStatsGrid stats={buyerStats} showPending />
      );
      const grid = container.querySelector(".grid-cols-4");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("3-column layout (vendor)", () => {
    it("renders three stat values (no pending)", () => {
      render(
        <ReferralStatsGrid stats={vendorStats} showPending={false} />
      );
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("does not render Pending label", () => {
      render(
        <ReferralStatsGrid stats={vendorStats} showPending={false} />
      );
      expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    });

    it("renders with grid-cols-3 class", () => {
      const { container } = render(
        <ReferralStatsGrid stats={vendorStats} showPending={false} />
      );
      const grid = container.querySelector(".grid-cols-3");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("header", () => {
    it("renders header with TrendingUp icon when showHeader is true", () => {
      render(
        <ReferralStatsGrid stats={buyerStats} showPending showHeader />
      );
      expect(
        screen.getByText("Your Referral Stats")
      ).toBeInTheDocument();
      expect(screen.getByTestId("icon-trending")).toBeInTheDocument();
    });

    it("does not render header when showHeader is false", () => {
      render(<ReferralStatsGrid stats={buyerStats} showPending />);
      expect(
        screen.queryByText("Your Referral Stats")
      ).not.toBeInTheDocument();
    });
  });

  describe("compact mode", () => {
    it("renders with gap-3 when compact is true", () => {
      const { container } = render(
        <ReferralStatsGrid stats={buyerStats} showPending compact />
      );
      const grid = container.querySelector(".gap-3");
      expect(grid).toBeInTheDocument();
    });

    it("renders with gap-4 when compact is false", () => {
      const { container } = render(
        <ReferralStatsGrid stats={buyerStats} showPending />
      );
      const grid = container.querySelector(".gap-4");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("number formatting", () => {
    it("handles single-digit values", () => {
      render(
        <ReferralStatsGrid
          stats={{ total: 1, converted: 0, rewarded: 0 }}
          showPending={false}
        />
      );
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("handles large numbers", () => {
      render(
        <ReferralStatsGrid
          stats={{ total: 999, converted: 500, rewarded: 250 }}
          showPending={false}
        />
      );
      expect(screen.getByText("999")).toBeInTheDocument();
    });
  });
});
