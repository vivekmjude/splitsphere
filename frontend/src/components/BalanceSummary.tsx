"use client";

import { useMemo, memo } from "react";
import { Expense, Currency, Settlement } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";

interface BalanceSummaryProps {
  expenses: Expense[];
  userId: string;
  title?: string;
  className?: string;
  showIfEmpty?: boolean;
  compact?: boolean;
}

/**
 * A reusable component to display balance summary for a user across different currencies
 */
const BalanceSummary = memo(function BalanceSummary({
  expenses,
  userId,
  title = "Balance Summary",
  className = "",
  showIfEmpty = false,
  compact = false,
}: BalanceSummaryProps) {
  // Calculate balances by currency
  const balances = useMemo(() => {
    // Create object to track amounts by currency
    const balanceByCurrency: Record<Currency, { owed: number; owing: number }> =
      {
        USD: { owed: 0, owing: 0 },
        EUR: { owed: 0, owing: 0 },
        GBP: { owed: 0, owing: 0 },
        INR: { owed: 0, owing: 0 },
      };

    // Loop through all expenses
    expenses.forEach((expense) => {
      const { settlements, currency } = expense;

      if (!settlements) return;

      // Process each settlement
      settlements.forEach((settlement: Settlement) => {
        // Skip fully settled entries
        if (settlement.isFullySettled) return;

        // Calculate remaining amount
        const settledAmount = settlement.settledAmount || 0;
        const remainingAmount = settlement.amount - settledAmount;

        // If user is owed money
        if (settlement.toUserId === userId) {
          balanceByCurrency[currency].owed += remainingAmount;
        }

        // If user owes money
        if (settlement.fromUserId === userId) {
          balanceByCurrency[currency].owing += remainingAmount;
        }
      });
    });

    // Filter out currencies with zero balances
    return Object.entries(balanceByCurrency)
      .filter(([, { owed, owing }]) => owed > 0 || owing > 0)
      .reduce(
        (acc, [currency, value]) => {
          acc[currency as Currency] = value;
          return acc;
        },
        {} as Record<Currency, { owed: number; owing: number }>
      );
  }, [expenses, userId]);

  // If no balances and we don't want to show empty state, don't show anything
  if (Object.keys(balances).length === 0 && !showIfEmpty) {
    return null;
  }

  return (
    <div className={`bg-card rounded-lg border p-4 shadow-sm ${className}`}>
      {title && <h2 className="mb-2 text-lg font-semibold">{title}</h2>}

      {Object.keys(balances).length === 0 ? (
        <p className="text-muted-foreground text-sm">No outstanding balances</p>
      ) : (
        <div
          className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
        >
          {Object.entries(balances).map(([currency, { owed, owing }]) => (
            <div
              key={currency}
              className="bg-muted/50 flex items-center justify-between rounded-md p-3"
            >
              <span className="font-medium">{currency}</span>
              <div className="space-y-1 text-right">
                {owing > 0 && (
                  <div className="text-sm text-red-500">
                    You owe: {formatCurrency(owing, currency as Currency)}
                  </div>
                )}
                {owed > 0 && (
                  <div className="text-sm text-green-600">
                    You are owed: {formatCurrency(owed, currency as Currency)}
                  </div>
                )}
                <div
                  className={`text-sm font-medium ${
                    owed - owing > 0
                      ? "text-green-600"
                      : owed - owing < 0
                        ? "text-red-500"
                        : "text-gray-500"
                  }`}
                >
                  Net: {formatCurrency(owed - owing, currency as Currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default BalanceSummary;
