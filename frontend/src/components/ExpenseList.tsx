import { useState, useMemo } from "react";
import { Expense, Settlement } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import DateDisplay from "./DateDisplay";
import { Group } from "@/types/group";
import { Card, CardContent } from "@/components/ui/card";
import ExpensePopout from "./ExpensePopout";
import { useExpenseStore } from "@/store/expense-store";
import { Button } from "@/components/ui/button";
import SettleUpDialog from "./SettleUpDialog";
import { db, addToSyncQueue } from "@/lib/db";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpenseListProps {
  expenses: Expense[];
  showGroupName?: boolean;
  groups?: Group[];
  limit?: number;
  showExpand?: boolean;
  title?: string;
}

export default function ExpenseList({
  expenses,
  showGroupName,
  groups,
  limit = 0, // Default to showing all
  showExpand = true,
  title,
}: ExpenseListProps) {
  const router = useRouter();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const { currentUser, refreshExpense } = useExpenseStore();
  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);
  const [isSettleUpDialogOpen, setIsSettleUpDialogOpen] = useState(false);
  const [settlementExpense, setSettlementExpense] = useState<Expense | null>(
    null
  );
  const [isManualSettlement, setIsManualSettlement] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Determine which expenses to display based on limit and expanded state
  const displayExpenses = useMemo(() => {
    if (limit <= 0 || expenses.length <= limit || expanded) {
      return expenses;
    }
    return expenses.slice(0, limit);
  }, [expenses, limit, expanded]);

  const getGroupName = (groupId: string) => {
    return groups?.find((g) => g.id === groupId)?.name || "Unknown Group";
  };

  // Helper to determine if the current user paid for an expense
  const didCurrentUserPay = (expense: Expense) => {
    return (
      expense.payments?.some((payment) => payment.userId === currentUser.id) ||
      expense.paidBy === currentUser.id
    );
  };

  // Helper to get primary payer name
  const getPrimaryPayerInfo = (expense: Expense) => {
    if (!expense.payments || expense.payments.length === 0) {
      // Fallback to paidBy for backward compatibility
      return {
        name:
          expense.paidBy === currentUser.id
            ? "You"
            : getUserName(expense.paidBy),
        amount: expense.amount,
      };
    }

    // Sort payments by amount (highest first) to find primary payer
    const sortedPayments = [...expense.payments].sort(
      (a, b) => b.amount - a.amount
    );
    const primaryPayment = sortedPayments[0];
    const isCurrentUser = primaryPayment.userId === currentUser.id;

    if (sortedPayments.length === 1) {
      return {
        name: isCurrentUser ? "You" : getUserName(primaryPayment.userId),
        amount: primaryPayment.amount,
      };
    } else {
      return {
        name: isCurrentUser ? "You" : getUserName(primaryPayment.userId),
        amount: primaryPayment.amount,
        others: sortedPayments.length - 1,
      };
    }
  };

  // Helper to get user name from user ID
  const getUserName = (userId: string): string => {
    return getUser(userId).name;
  };

  // Handler for Settle Up button
  const handleSettleUp = (
    e: React.MouseEvent,
    expense: Expense,
    settlement: Settlement
  ) => {
    e.stopPropagation(); // Prevent the card click from triggering
    setSelectedSettlement(settlement);
    setSettlementExpense(expense);
    setIsManualSettlement(false);
    setIsSettleUpDialogOpen(true);
  };

  // Handler for Mark as Settled button
  const handleMarkAsSettled = (
    e: React.MouseEvent,
    expense: Expense,
    settlement: Settlement
  ) => {
    e.stopPropagation(); // Prevent the card click from triggering
    setSelectedSettlement(settlement);
    setSettlementExpense(expense);
    setIsManualSettlement(true);
    setIsSettleUpDialogOpen(true);
  };

  // Function to mark a settlement as settled
  const markSettlementAsSettled = async (
    expenseId: string,
    settlement: Settlement
  ) => {
    try {
      const expense = await db.expenses.get(expenseId);
      if (!expense) {
        console.error("Expense not found");
        return;
      }

      // Update the settlement in the expense
      const updatedSettlements = expense.settlements.map((s: Settlement) => {
        if (
          s.fromUserId === settlement.fromUserId &&
          s.toUserId === settlement.toUserId
        ) {
          return {
            ...s,
            settledAmount: s.amount, // Mark the full amount as settled
            isFullySettled: true,
          };
        }
        return s;
      });

      // Create updated expense object
      const updatedExpense = {
        ...expense,
        settlements: updatedSettlements,
        _lastModified: Date.now(),
        _synced: false,
      };

      // Update in IndexedDB
      await db.expenses.put(updatedExpense);

      // Add to sync queue
      await addToSyncQueue("expenses", "update", {
        id: expenseId,
        settlements: updatedSettlements,
      } as unknown as Record<string, unknown>);

      // Refresh the expense in the store
      await refreshExpense(expenseId);
    } catch (error) {
      console.error("Failed to mark settlement as settled:", error);
    }
  };

  // Get User object for a given ID
  const getUser = (userId: string) => {
    return useExpenseStore.getState().getUserById(userId);
  };

  // Function to refresh UI after payment
  const refreshAfterPayment = async () => {
    if (!settlementExpense) return;

    try {
      // Refresh the expense data
      await refreshExpense(settlementExpense.id);

      // Force re-render by updating local component state
      setIsSettleUpDialogOpen(false);
      setSelectedSettlement(null);
      setSettlementExpense(null);
      setIsManualSettlement(false);

      // Close the expense popout
      setSelectedExpense(null);

      // Navigate to the dashboard with client-side navigation
      router.push("/");
    } catch (error) {
      console.error("Error refreshing expense after payment:", error);
    }
  };

  return (
    <>
      {title && <h3 className="mb-3 text-lg font-medium">{title}</h3>}
      <div className="space-y-4">
        {displayExpenses.map((expense) => {
          const payerInfo = getPrimaryPayerInfo(expense);
          const youPaid = didCurrentUserPay(expense);

          // Find your split
          const yourSplit = expense.splits.find(
            (split) => split.userId === currentUser.id
          );

          // Get all settlements involving the current user
          const yourSettlements = expense.settlements?.filter(
            (settlement) =>
              settlement.fromUserId === currentUser.id ||
              settlement.toUserId === currentUser.id
          );

          // Calculate total amount owed to the current user for group expenses
          let totalOwedToYou = 0;
          let totalYouOwe = 0;

          if (yourSettlements && yourSettlements.length > 0) {
            // Sum up all amounts where you are owed or owe money
            yourSettlements.forEach((settlement) => {
              // Money you are owed (you are the recipient)
              if (settlement.toUserId === currentUser.id) {
                const settledAmount = settlement.settledAmount || 0;
                const remaining = settlement.amount - settledAmount;
                totalOwedToYou += remaining;
              }
              // Money you owe others (you are the payer)
              else if (settlement.fromUserId === currentUser.id) {
                const settledAmount = settlement.settledAmount || 0;
                const remaining = settlement.amount - settledAmount;
                totalYouOwe += remaining;
              }
            });
          }

          // Get the primary settlement for display purposes
          const yourSettlement =
            yourSettlements && yourSettlements.length > 0
              ? yourSettlements[0]
              : null;

          // Check if user owes money in any settlement
          const youOwe = expense.groupId
            ? totalYouOwe > 0
            : yourSettlement && yourSettlement.fromUserId === currentUser.id;

          // Check if user is owed money in any settlement
          const youAreOwed = expense.groupId
            ? totalOwedToYou > 0
            : yourSettlements &&
              yourSettlements.some((s) => s.toUserId === currentUser.id);

          // Only show the settle button if not already fully settled
          const canSettle =
            youOwe && yourSettlement && yourSettlement.isFullySettled !== true;

          // Show mark as settled button if user is owed money and not already settled
          // AND only for non-group expenses (where groupId is null or empty)
          const canMarkAsSettled =
            youAreOwed &&
            yourSettlement &&
            yourSettlement.isFullySettled !== true &&
            !expense.groupId; // Don't show for group expenses

          // For tag display, check if ALL settlements involving the current user are fully settled
          const allSettlementsFullySettled =
            yourSettlements &&
            yourSettlements.length > 0 &&
            yourSettlements.every((s) => s.isFullySettled === true);

          // For group expenses, check if ANY settlements are fully settled
          const someSettlementsFullySettled =
            expense.groupId &&
            expense.settlements &&
            expense.settlements.some((s) => s.isFullySettled === true);

          // Check partial settlement - at least one settlement has been partially paid but not all are fully settled
          const partiallySettled =
            // For personal expenses: check if your settlement is partially paid
            (!expense.groupId &&
              yourSettlements &&
              yourSettlements.some(
                (s) =>
                  s.settledAmount !== undefined &&
                  s.settledAmount > 0 &&
                  !s.isFullySettled
              )) ||
            // For group expenses: check if some settlements are fully settled but not all
            (expense.groupId &&
              someSettlementsFullySettled &&
              !allSettlementsFullySettled);

          // Calculate the amount to display for what you owe or are owed
          const remainingAmount = youOwe
            ? totalYouOwe // Always use the sum for what you owe
            : youAreOwed
              ? totalOwedToYou // Always use the sum for what you're owed
              : 0;

          return (
            <Card
              key={expense.id}
              className="card-gradient-light cursor-pointer"
              onClick={() => setSelectedExpense(expense)}
            >
              <CardContent className="px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium tracking-tight text-gray-800 dark:text-gray-300">
                      {expense.name}
                    </h3>
                    {expense.description && (
                      <p className="text-muted-foreground/80 mt-1.5 text-sm">
                        {expense.description}
                      </p>
                    )}
                    <p className="text-muted-foreground/70 mt-2 text-sm">
                      <DateDisplay date={expense.date} />
                      {showGroupName && expense.groupId && (
                        <>
                          {" "}
                          •{" "}
                          <span className="text-brand-subtle">
                            {getGroupName(expense.groupId)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-brand text-lg font-semibold tracking-tight">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                    <div className="text-muted-foreground/70 mt-2 text-sm">
                      <p>
                        {payerInfo.name} paid
                        {payerInfo.others
                          ? ` (+ ${payerInfo.others} others)`
                          : ""}
                      </p>
                      <p>Split: {expense.splitType.toLowerCase()}</p>
                      {yourSettlement && (
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <p
                            className={
                              youOwe ? "text-red-500" : "text-green-500"
                            }
                          >
                            {allSettlementsFullySettled
                              ? null
                              : youOwe
                                ? `You owe ${formatCurrency(remainingAmount, expense.currency)}`
                                : youAreOwed
                                  ? `You're owed ${formatCurrency(remainingAmount, expense.currency)}`
                                  : null}
                          </p>
                          {allSettlementsFullySettled && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Settled
                            </span>
                          )}
                          {partiallySettled && (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                              Partial
                            </span>
                          )}
                          {canSettle && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) =>
                                handleSettleUp(e, expense, yourSettlement)
                              }
                              className="h-6 px-2 text-xs"
                            >
                              Settle
                            </Button>
                          )}
                          {canMarkAsSettled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) =>
                                handleMarkAsSettled(e, expense, yourSettlement)
                              }
                              className="h-6 px-2 text-xs"
                            >
                              Mark as Settled
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Show expand/collapse button only if needed */}
        {showExpand && limit > 0 && expenses.length > limit && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Show {expenses.length - limit} more</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <ExpensePopout
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        groups={groups}
      />

      {/* Settle Up Dialog */}
      {selectedSettlement && settlementExpense && (
        <SettleUpDialog
          open={isSettleUpDialogOpen}
          onClose={() => setIsSettleUpDialogOpen(false)}
          settlement={selectedSettlement}
          fromUser={getUser(selectedSettlement.fromUserId)}
          toUser={getUser(selectedSettlement.toUserId)}
          currency={settlementExpense.currency}
          relatedExpenseIds={[settlementExpense.id]}
          onPaymentComplete={refreshAfterPayment}
          isManualSettlement={isManualSettlement}
        />
      )}
    </>
  );
}
