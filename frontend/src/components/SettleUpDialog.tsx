"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { User, Currency, Settlement, SettlementPayment } from "@/types/expense";
import { useExpenseStore } from "@/store/expense-store";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db, addToSyncQueue } from "@/lib/db";

interface SettleUpDialogProps {
  open: boolean;
  onClose: () => void;
  settlement: Settlement | null;
  fromUser: User | null;
  toUser: User | null;
  currency: Currency;
  relatedExpenseIds?: string[];
  onPaymentComplete?: () => void;
  isManualSettlement?: boolean;
}

export default function SettleUpDialog({
  open,
  onClose,
  settlement,
  fromUser,
  toUser,
  currency,
  relatedExpenseIds,
  onPaymentComplete,
  isManualSettlement = false,
}: SettleUpDialogProps) {
  const { currentUser, refreshExpense } = useExpenseStore();
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set the initial amount to the remaining settlement amount
  useEffect(() => {
    if (settlement) {
      try {
        // Calculate remaining amount for partially settled expenses
        const settledAmount = settlement.settledAmount || 0;
        const remainingAmount = settlement.amount - settledAmount;
        setAmount(remainingAmount.toString());
      } catch (error) {
        console.error("Error setting initial amount:", error);
        setAmount("0");
      }
    }
  }, [settlement]);

  // Set default note for manual settlement
  useEffect(() => {
    if (isManualSettlement) {
      setNote(
        `${toUser?.name || "User"} marked the payment as settled up manually`
      );
    } else {
      setNote("");
    }
  }, [isManualSettlement, toUser]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty input for clearing the field
    if (value === "") {
      setAmount("");
      return;
    }

    // More permissive validation during editing - allow any numeric input with up to 2 decimal places
    // This allows for more natural typing behavior
    if (/^(\d*\.?\d{0,2})$/.test(value)) {
      setAmount(value);
    }
  };

  const isValidAmount = () => {
    try {
      const numAmount = parseFloat(amount);
      const settledAmount = settlement?.settledAmount || 0;
      const remainingAmount = (settlement?.amount || 0) - settledAmount;

      return !isNaN(numAmount) && numAmount > 0 && numAmount <= remainingAmount;
    } catch (error) {
      console.error("Error validating amount:", error);
      return false;
    }
  };

  const handleSubmit = async () => {
    try {
      if (!settlement || !fromUser || !toUser) {
        console.error("Missing required data for settlement", {
          settlement,
          fromUser,
          toUser,
        });
        alert("Cannot process payment: missing settlement data");
        return;
      }

      if (!isValidAmount()) {
        alert("Please enter a valid amount");
        return;
      }

      // Check if this settlement is already fully settled
      if (settlement.isFullySettled === true) {
        alert("This debt has already been fully settled");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(true);
      const numAmount = parseFloat(amount);

      // Get existing payments for this settlement pair
      const existingPayments = await db.settlementPayments
        .where("[fromUserId+toUserId]")
        .equals([fromUser.id, toUser.id])
        .filter((payment) => {
          // If no relatedExpenseIds provided, include all payments between these users
          if (!relatedExpenseIds || relatedExpenseIds.length === 0) return true;

          // If this payment doesn't have relatedExpenseIds, include it for all settlements between these users
          if (
            !payment.relatedExpenseIds ||
            payment.relatedExpenseIds.length === 0
          )
            return true;

          // Check if any of this payment's related expenses match our current expenses
          return payment.relatedExpenseIds.some((id) =>
            relatedExpenseIds.includes(id)
          );
        })
        .toArray();

      console.log("Existing payments found:", existingPayments);

      // Calculate total already paid
      const alreadyPaid = existingPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      // Check if this payment would exceed the settlement amount
      const totalAfterPayment = alreadyPaid + numAmount;
      if (totalAfterPayment > settlement.amount) {
        alert(
          `You've already paid ${formatCurrency(alreadyPaid, currency)} for this specific expense. This payment would exceed the total owed for this split.`
        );
        setIsSubmitting(false);
        return;
      }

      // Determine if this payment will fully settle the debt
      const willFullySettle =
        Math.abs(totalAfterPayment - settlement.amount) < 0.01;

      console.log("Settlement payment details:", {
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        amount: numAmount,
        currency,
        alreadyPaid,
        totalAfterPayment,
        settlementAmount: settlement.amount,
        willFullySettle,
        forExpenses: relatedExpenseIds,
      });

      // Create the settlement payment record
      const settlementPayment: SettlementPayment = {
        id: uuidv4(),
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        amount: numAmount,
        currency,
        date: new Date().toISOString().split("T")[0],
        note: note || undefined,
        relatedExpenseIds: relatedExpenseIds?.length
          ? relatedExpenseIds
          : undefined,
      };

      // Add to database with sync metadata
      await db.settlementPayments.add({
        ...settlementPayment,
        _synced: false,
        _lastModified: Date.now(),
      });

      // Add to sync queue
      await addToSyncQueue(
        "settlementPayments",
        "add",
        settlementPayment as unknown as Record<string, unknown>
      );

      // If this payment fully settles the debt, update the related expenses
      if (relatedExpenseIds?.length) {
        for (const expenseId of relatedExpenseIds) {
          const expense = await db.expenses.get(expenseId);
          if (expense) {
            // Update the settlement in the expense
            const updatedSettlements = expense.settlements.map((s) => {
              if (s.fromUserId === fromUser.id && s.toUserId === toUser.id) {
                // Calculate the new settled amount (existing + current payment)
                const currentSettledAmount = s.settledAmount || 0;
                const newSettledAmount = currentSettledAmount + numAmount;

                return {
                  ...s,
                  settledAmount: newSettledAmount,
                  isFullySettled: willFullySettle,
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

            // Update the expense with PUT operation to ensure full object is saved
            await db.expenses.put(updatedExpense);

            // Add to sync queue
            await addToSyncQueue("expenses", "update", {
              id: expenseId,
              settlements: updatedSettlements,
            } as unknown as Record<string, unknown>);

            // Refresh the expense in the store to update the UI
            await refreshExpense(expenseId);

            console.log("Updated expense settlements:", updatedSettlements);
          }
        }
      }

      // Reset form and close dialog
      setAmount("");
      setNote("");

      // Call the onPaymentComplete callback if provided
      if (onPaymentComplete) {
        onPaymentComplete();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to record settlement payment:", error);
      alert("Failed to record payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!settlement || !fromUser || !toUser) {
    console.warn("SettleUpDialog missing required props", {
      settlement,
      fromUser,
      toUser,
    });
    // Return an error dialog instead of null
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Unable to process settlement due to missing data.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isManualSettlement ? "Mark as Settled" : "Settle Up"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {isManualSettlement ? (
                <>
                  <span className="font-medium">
                    {fromUser.id === currentUser.id ? "You" : fromUser.name}
                  </span>{" "}
                  paid{" "}
                  <span className="font-medium">
                    {toUser.id === currentUser.id ? "you" : toUser.name}
                  </span>{" "}
                  outside the app
                </>
              ) : (
                <>
                  <span className="font-medium">
                    {fromUser.id === currentUser.id ? "You" : fromUser.name}
                  </span>{" "}
                  {fromUser.id === currentUser.id ? "are" : "is"} paying{" "}
                  <span className="font-medium">
                    {toUser.id === currentUser.id ? "you" : toUser.name}
                  </span>
                </>
              )}
            </div>
            <div className="text-muted-foreground text-sm">
              {settlement.settledAmount && settlement.settledAmount > 0 ? (
                <>
                  Total owed: {formatCurrency(settlement.amount, currency)}
                  <br />
                  Already paid:{" "}
                  {formatCurrency(settlement.settledAmount, currency)}
                  <br />
                  Remaining:{" "}
                  {formatCurrency(
                    settlement.amount - settlement.settledAmount,
                    currency
                  )}
                </>
              ) : (
                <>Total owed: {formatCurrency(settlement.amount, currency)}</>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium">Payment amount</div>
            <div className="flex items-center gap-2">
              <div className="text-sm">{currency}</div>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="flex-1"
                aria-label="Payment amount"
              />
            </div>
            {parseFloat(amount) >
              settlement.amount - (settlement.settledAmount || 0) && (
              <div className="mt-1 text-xs text-red-500">
                Payment amount cannot be more than the remaining balance
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-sm font-medium">Note (optional)</div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this payment"
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValidAmount() || isSubmitting}
          >
            {isSubmitting ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
