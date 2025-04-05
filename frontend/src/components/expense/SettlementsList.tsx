import { Expense, Settlement } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useExpenseStore } from "@/store/expense-store";
import { useState } from "react";
import SettleUpDialog from "@/components/SettleUpDialog";
import { useRouter } from "next/navigation";

interface SettlementsListProps {
  expense: Expense;
  onPaymentComplete?: () => void;
}

export default function SettlementsList({
  expense,
  onPaymentComplete,
}: SettlementsListProps) {
  const router = useRouter();
  const { currentUser, refreshExpense } = useExpenseStore();
  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);
  const [isSettleUpDialogOpen, setIsSettleUpDialogOpen] = useState(false);
  const [isManualSettlement, setIsManualSettlement] = useState(false);

  // Get user object by ID
  const getUser = (userId: string) => {
    return useExpenseStore.getState().getUserById(userId);
  };

  // Get user name by ID
  const getUserName = (userId: string): string => {
    return getUser(userId).name;
  };

  // Handle opening the settle up dialog
  const handleOpenSettleUp = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setIsManualSettlement(false);
    setIsSettleUpDialogOpen(true);
  };

  // Handle opening the mark as settled dialog
  const handleMarkAsSettled = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setIsManualSettlement(true);
    setIsSettleUpDialogOpen(true);
  };

  // Function to refresh the expense data after a payment is recorded
  const refreshExpenseData = async () => {
    try {
      // Refresh the expense from the database
      const refreshed = await refreshExpense(expense.id);

      // If we got a refreshed expense, update the local state
      if (refreshed) {
        // Close settle dialog and reset state
        setIsSettleUpDialogOpen(false);
        setSelectedSettlement(null);

        // Call the parent's onPaymentComplete callback if provided
        // This allows the parent ExpensePopout to close too
        if (onPaymentComplete) {
          onPaymentComplete();
        }

        // Navigate to the dashboard with client-side navigation
        router.push("/");
      }
    } catch (error) {
      console.error("Error refreshing expense data:", error);
    }
  };

  // Check if a settlement button should be shown for the current user
  const shouldShowSettleUpButton = (settlement: Settlement): boolean => {
    return (
      settlement.fromUserId === currentUser.id &&
      settlement.isFullySettled !== true
    );
  };

  // Check if a "mark as settled" button should be shown for the current user
  const shouldShowMarkAsSettledButton = (settlement: Settlement): boolean => {
    return (
      settlement.toUserId === currentUser.id &&
      settlement.isFullySettled !== true
    );
  };

  // Calculate the remaining amount for a settlement
  const getRemainingAmount = (settlement: Settlement): number => {
    const partiallySettled =
      settlement.settledAmount &&
      settlement.settledAmount > 0 &&
      !settlement.isFullySettled;

    return partiallySettled
      ? settlement.amount - (settlement.settledAmount || 0)
      : settlement.amount;
  };

  // Check if all settlements between two users are fully settled
  const areAllSettlementsWithUserSettled = (
    settlement: Settlement
  ): boolean => {
    const allUserSettlements =
      expense.settlements?.filter(
        (s) =>
          (s.fromUserId === currentUser.id &&
            s.toUserId === settlement.toUserId) ||
          (s.toUserId === currentUser.id &&
            s.fromUserId === settlement.fromUserId)
      ) || [];

    return allUserSettlements.length === 1
      ? settlement.isFullySettled === true
      : allUserSettlements.every((s) => s.isFullySettled === true);
  };

  // Check if a settlement is partially settled
  const isPartiallySettled = (settlement: Settlement): boolean => {
    return (
      settlement.settledAmount !== undefined &&
      settlement.settledAmount > 0 &&
      !settlement.isFullySettled
    );
  };

  // If no settlements, don't render anything
  if (!expense.settlements || expense.settlements.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        SETTLEMENTS
      </h3>
      <div className="mt-2 space-y-2">
        {expense.settlements.map((settlement, index) => {
          const showSettleUpButton = shouldShowSettleUpButton(settlement);
          const showMarkAsSettledButton =
            shouldShowMarkAsSettledButton(settlement);
          const remainingAmount = getRemainingAmount(settlement);
          const allSettlementsWithThisUserSettled =
            areAllSettlementsWithUserSettled(settlement);
          const partiallySettled = isPartiallySettled(settlement);

          return (
            <div
              key={`settlement-view-${index}`}
              className="flex items-center justify-between"
            >
              <div className="flex-1">
                <span
                  className={`text-sm ${
                    settlement.fromUserId === currentUser.id
                      ? "text-red-500"
                      : settlement.toUserId === currentUser.id
                        ? "text-green-500"
                        : ""
                  }`}
                >
                  {allSettlementsWithThisUserSettled
                    ? settlement.fromUserId === currentUser.id
                      ? "Settled with " + getUserName(settlement.toUserId)
                      : settlement.toUserId === currentUser.id
                        ? "Settled with " + getUserName(settlement.fromUserId)
                        : getUserName(settlement.fromUserId) +
                          " settled with " +
                          getUserName(settlement.toUserId)
                    : settlement.fromUserId === currentUser.id
                      ? "You owe " + getUserName(settlement.toUserId)
                      : settlement.toUserId === currentUser.id
                        ? getUserName(settlement.fromUserId) + " owes you"
                        : getUserName(settlement.fromUserId) +
                          " owes " +
                          getUserName(settlement.toUserId)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    settlement.fromUserId === currentUser.id
                      ? "text-red-500"
                      : settlement.toUserId === currentUser.id
                        ? "text-green-500"
                        : ""
                  }`}
                >
                  {formatCurrency(remainingAmount, expense.currency)}
                </span>
                {allSettlementsWithThisUserSettled && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Settled
                  </span>
                )}
                {partiallySettled && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                    Partially Settled
                  </span>
                )}
                {showSettleUpButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSettleUp(settlement);
                    }}
                  >
                    Settle Up
                  </Button>
                )}
                {showMarkAsSettledButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsSettled(settlement);
                    }}
                  >
                    Mark as Settled
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settle Up Dialog */}
      {selectedSettlement && (
        <SettleUpDialog
          open={isSettleUpDialogOpen}
          onClose={() => setIsSettleUpDialogOpen(false)}
          settlement={selectedSettlement}
          fromUser={getUser(selectedSettlement.fromUserId)}
          toUser={getUser(selectedSettlement.toUserId)}
          currency={expense.currency}
          relatedExpenseIds={[expense.id]}
          onPaymentComplete={refreshExpenseData}
          isManualSettlement={isManualSettlement}
        />
      )}
    </div>
  );
}
