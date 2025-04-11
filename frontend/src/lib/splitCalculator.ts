import { SplitType, Split, Payment, Settlement } from "@/types/expense";
import { User } from "@/types/expense";

/**
 * Calculate splits for an expense based on split type, amount, and participants
 */
export function calculateSplits({
  amount,
  splitType,
  participants,
  customSplits = {},
}: {
  amount: number;
  splitType: SplitType;
  participants: User[];
  customSplits?: Record<string, number>;
}): Split[] {
  if (!participants.length) {
    return [];
  }

  if (participants.length === 1) {
    return [
      {
        userId: participants[0].id,
        amount,
      },
    ];
  }

  switch (splitType) {
    case "EQUAL": {
      const equalAmount = amount / participants.length;
      return participants.map((participant) => ({
        userId: participant.id,
        amount: equalAmount,
      }));
    }

    case "UNEQUAL": {
      return participants.map((participant) => ({
        userId: participant.id,
        amount: customSplits[participant.id] || 0,
      }));
    }

    case "PERCENTAGE": {
      return participants.map((participant) => {
        const percentage = customSplits[participant.id] || 0;
        return {
          userId: participant.id,
          amount: (amount * percentage) / 100,
          percentage,
        };
      });
    }

    default:
      return [];
  }
}

/**
 * Recalculate splits when expense amount changes
 */
export function recalculateSplitsOnAmountChange({
  oldAmount,
  newAmount,
  oldSplits,
  splitType,
}: {
  oldAmount: number;
  newAmount: number;
  oldSplits: Split[];
  splitType: SplitType;
}): Split[] {
  if (oldAmount === newAmount || !oldSplits.length) {
    return oldSplits;
  }

  const ratio = newAmount / oldAmount;

  switch (splitType) {
    case "EQUAL": {
      const equalAmount = newAmount / oldSplits.length;
      return oldSplits.map((split) => ({
        ...split,
        amount: equalAmount,
      }));
    }

    case "PERCENTAGE": {
      return oldSplits.map((split) => ({
        ...split,
        amount: ((split.percentage || 0) * newAmount) / 100,
      }));
    }

    case "UNEQUAL": {
      return oldSplits.map((split) => ({
        ...split,
        amount: split.amount * ratio,
      }));
    }

    default:
      return oldSplits;
  }
}

interface CalculateSettlementsParams {
  payments: Payment[];
  splits: Split[];
}

/**
 * Calculates settlement transactions for an expense based on who paid and how the expense is split
 */
export function calculateSettlements({
  payments,
  splits,
}: CalculateSettlementsParams): Settlement[] {
  // If no payments, return empty settlements
  if (!payments || payments.length === 0) {
    return [];
  }

  // Step 1: Calculate net balance for each user
  const balances: Record<string, number> = {};

  // Add payments (positive balances)
  payments.forEach((payment) => {
    balances[payment.userId] = (balances[payment.userId] || 0) + payment.amount;
  });

  // Subtract splits (negative balances)
  splits.forEach((split) => {
    balances[split.userId] = (balances[split.userId] || 0) - split.amount;
  });

  // Step 2: Separate users into creditors (positive balance) and debtors (negative balance)
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  Object.entries(balances).forEach(([userId, balance]) => {
    // Skip users with zero balance (rare, but possible if someone paid exactly their share)
    if (Math.abs(balance) < 0.01) return;

    if (balance > 0) {
      creditors.push({ userId, amount: balance });
    } else {
      debtors.push({ userId, amount: -balance }); // Convert to positive amount
    }
  });

  // Step 3: Create settlements
  const settlements: Settlement[] = [];

  // Sort by amount (descending) to handle larger transactions first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // For each creditor, find one or more debtors to settle with
  for (const creditor of creditors) {
    let remainingCredit = creditor.amount;

    while (remainingCredit > 0.01 && debtors.length > 0) {
      const debtor = debtors[0];
      const amount = Math.min(remainingCredit, debtor.amount);

      // Create settlement record
      settlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount,
        settledAmount: 0,
        isFullySettled: false,
      });

      // Update remaining amounts
      remainingCredit -= amount;
      debtor.amount -= amount;

      // Remove debtor if fully settled
      if (debtor.amount < 0.01) {
        debtors.shift();
      }
    }
  }

  return settlements;
}
