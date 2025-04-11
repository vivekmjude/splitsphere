import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Settlement, Currency } from "@/types/expense";
import { db } from "@/lib/db";
import { addToSyncQueue } from "@/lib/db";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd-MMM-yyyy");
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Get the settlement payment history for a specific settlement
 */
export async function getSettlementPaymentHistory(
  fromUserId: string,
  toUserId: string
) {
  try {
    const payments = await db.settlementPayments
      .where("[fromUserId+toUserId]")
      .equals([fromUserId, toUserId])
      .toArray();

    // Calculate total amount paid
    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return {
      payments,
      totalPaid,
      success: true,
    };
  } catch (error) {
    console.error("Error getting settlement payment history:", error);
    return {
      payments: [],
      totalPaid: 0,
      success: false,
    };
  }
}

/**
 * Update settlement status for an expense based on payment history
 */
export async function updateSettlementStatus(
  expenseId: string,
  settlement: Settlement
) {
  try {
    // Get the expense
    const expense = await db.expenses.get(expenseId);
    if (!expense) return { success: false };

    // Get payment history
    const { totalPaid } = await getSettlementPaymentHistory(
      settlement.fromUserId,
      settlement.toUserId
    );

    // Check if fully settled
    const isFullySettled = Math.abs(totalPaid - settlement.amount) < 0.01;

    // Update the settlement in the expense
    const updatedSettlements = expense.settlements.map((s) => {
      if (
        s.fromUserId === settlement.fromUserId &&
        s.toUserId === settlement.toUserId
      ) {
        return {
          ...s,
          settledAmount: totalPaid,
          isFullySettled,
        };
      }
      return s;
    });

    // Update the expense
    await db.expenses.update(expenseId, {
      settlements: updatedSettlements,
      _lastModified: Date.now(),
      _synced: false,
    });

    // Add to sync queue
    await addToSyncQueue("expenses", "update", {
      id: expenseId,
      settlements: updatedSettlements,
    } as Record<string, unknown>);

    return { success: true, isFullySettled };
  } catch (error) {
    console.error("Error updating settlement status:", error);
    return { success: false };
  }
}
