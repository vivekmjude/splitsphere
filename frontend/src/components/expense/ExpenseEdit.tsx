import { ChangeEvent, FormEvent, useState, useEffect } from "react";
import { Expense, SplitType, User, Split, Currency } from "@/types/expense";
import { useExpenseStore } from "@/store/expense-store";
import { useFriendsStore } from "@/store/friends-store";
import { useGroupsStore } from "@/store/groups-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { calculateSettlements } from "@/lib/splitCalculator";
import SplitEditor from "./SplitEditor";

interface ExpenseEditProps {
  expense: Expense;
  onSave: () => void;
  onCancel: () => void;
}

export default function ExpenseEdit({
  expense,
  onSave,
  onCancel,
}: ExpenseEditProps) {
  const { currentUser, editExpense } = useExpenseStore();
  const { friends } = useFriendsStore();
  const { groups: allGroups } = useGroupsStore();

  const [editedExpense, setEditedExpense] = useState<Expense>({ ...expense });

  const [editData, setEditData] = useState({
    selectedParticipantType: "just-me" as "just-me" | "friends" | "group",
    selectedFriendIds: [] as string[],
    selectedGroupId: "",
  });

  // Get accepted friends
  const acceptedFriends = friends.filter((f) => f.status === "ACCEPTED");

  // Initialize participant type and selections
  useEffect(() => {
    let participantType: "just-me" | "friends" | "group" = "just-me";
    let friendIds: string[] = [];

    if (expense.groupId) {
      participantType = "group";
    } else if (expense.splits.length > 1) {
      participantType = "friends";
      friendIds = expense.splits
        .map((split) => split.userId)
        .filter((id) => id !== currentUser.id);
    }

    setEditData({
      selectedParticipantType: participantType,
      selectedFriendIds: friendIds,
      selectedGroupId: expense.groupId || "",
    });
  }, [expense, currentUser.id]);

  // Handle participant type change
  const handleParticipantTypeChange = (
    type: "just-me" | "friends" | "group"
  ) => {
    setEditData((prev) => ({
      ...prev,
      selectedParticipantType: type,
      selectedFriendIds: [],
      selectedGroupId: "",
    }));
  };

  // Handle friend selection
  const handleFriendSelection = (friendId: string, isSelected: boolean) => {
    setEditData((prev) => ({
      ...prev,
      selectedFriendIds: isSelected
        ? [...prev.selectedFriendIds, friendId]
        : prev.selectedFriendIds.filter((id) => id !== friendId),
    }));
  };

  // Handle group selection
  const handleGroupSelection = (groupId: string) => {
    setEditData((prev) => ({
      ...prev,
      selectedGroupId: groupId,
    }));
  };

  // Get participants based on selection
  const getParticipants = (): User[] => {
    if (editData.selectedParticipantType === "just-me") {
      return [currentUser];
    } else if (editData.selectedParticipantType === "friends") {
      const selectedFriends = acceptedFriends.filter((friend) =>
        editData.selectedFriendIds.includes(friend.id)
      );
      return [currentUser, ...selectedFriends];
    } else if (editData.selectedParticipantType === "group") {
      const selectedGroup = allGroups.find(
        (g) => g.id === editData.selectedGroupId
      );
      if (selectedGroup) {
        return selectedGroup.members;
      }
    }
    return [currentUser];
  };

  // Handle split type change
  const handleSplitTypeChange = (splitType: SplitType) => {
    setEditedExpense((prev) => ({ ...prev, splitType }));
  };

  // Handle amount change
  const handleAmountChange = (amount: number) => {
    setEditedExpense((prev) => ({ ...prev, amount }));
  };

  // Handle generic field changes
  const handleFieldChange = <K extends keyof Expense>(
    field: K,
    value: Expense[K]
  ) => {
    setEditedExpense((prev) => ({ ...prev, [field]: value }));
  };

  // Handle splits change from SplitEditor
  const handleSplitsChange = (newSplits: Split[]) => {
    setEditedExpense((prev) => ({ ...prev, splits: newSplits }));
  };

  // Handle payment change
  const handlePaymentChange = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const payments = editedExpense.payments || [];

    // Update or add a payment
    const updatedPayments = [...payments];
    const paymentIndex = payments.findIndex((p) => p.userId === userId);

    if (paymentIndex >= 0) {
      if (numValue <= 0) {
        // Remove payment if amount is zero or negative
        updatedPayments.splice(paymentIndex, 1);
      } else {
        // Update existing payment
        updatedPayments[paymentIndex] = {
          ...updatedPayments[paymentIndex],
          amount: numValue,
        };
      }
    } else if (numValue > 0) {
      // Add new payment
      updatedPayments.push({ userId, amount: numValue });
    }

    setEditedExpense((prev) => ({ ...prev, payments: updatedPayments }));
  };

  // Validate payment total matches expense amount
  const validatePayments = (): boolean => {
    if (!editedExpense.payments || editedExpense.payments.length === 0) {
      return true; // If no payments specified, assume valid
    }

    const totalPayments = editedExpense.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return Math.abs(totalPayments - editedExpense.amount) < 0.01;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      // Validate total amount for unequal splits
      if (editedExpense.splitType === "UNEQUAL") {
        const totalSplitAmount = editedExpense.splits.reduce(
          (sum, split) => sum + split.amount,
          0
        );

        if (Math.abs(totalSplitAmount - editedExpense.amount) > 0.01) {
          alert("Split amounts must total the expense amount");
          return;
        }
      }

      // Validate payments
      if (!validatePayments()) {
        alert("Total payments must equal expense amount");
        return;
      }

      // Calculate settlements
      const settlements = calculateSettlements({
        payments: editedExpense.payments || [],
        splits: editedExpense.splits,
      });

      // Update the edited expense with settlements and group ID
      await editExpense(expense.id, {
        ...editedExpense,
        settlements,
        groupId:
          editData.selectedParticipantType === "group"
            ? editData.selectedGroupId
            : undefined,
      });

      onSave();
    } catch (error) {
      console.error("Failed to edit expense:", error);
    }
  };

  // Get participants
  const participants = getParticipants();

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            value={editedExpense.name || ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleFieldChange("name", e.target.value)
            }
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium"
          >
            Description
          </label>
          <Textarea
            id="description"
            value={editedExpense.description || ""}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              handleFieldChange("description", e.target.value)
            }
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Split With</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={editData.selectedParticipantType === "just-me"}
                onChange={() => handleParticipantTypeChange("just-me")}
                className="border-input rounded"
              />
              <span>Just me</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={editData.selectedParticipantType === "friends"}
                onChange={() => handleParticipantTypeChange("friends")}
                className="border-input rounded"
              />
              <span>Select friends</span>
            </label>

            {editData.selectedParticipantType === "friends" && (
              <div className="mt-2 space-y-2 pl-6">
                {acceptedFriends.map((friend) => (
                  <label key={friend.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.selectedFriendIds.includes(friend.id)}
                      onChange={(e) =>
                        handleFriendSelection(friend.id, e.target.checked)
                      }
                      className="border-input rounded"
                    />
                    <span>{friend.name}</span>
                  </label>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={editData.selectedParticipantType === "group"}
                onChange={() => handleParticipantTypeChange("group")}
                className="border-input rounded"
              />
              <span>Select group</span>
            </label>

            {editData.selectedParticipantType === "group" && (
              <div className="mt-2 pl-6">
                <label htmlFor="group-select" className="sr-only">
                  Select a group
                </label>
                <select
                  id="group-select"
                  value={editData.selectedGroupId}
                  onChange={(e) => handleGroupSelection(e.target.value)}
                  className="border-input w-full rounded-md border p-2"
                  aria-label="Select a group"
                >
                  <option value="">Select a group</option>
                  {allGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium">
            Amount
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="amount"
              type="number"
              value={editedExpense.amount || 0}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleAmountChange(parseFloat(e.target.value))
              }
            />
            <Select
              value={editedExpense.currency || "USD"}
              onValueChange={(value: Currency) => {
                if (value !== editedExpense.currency) {
                  handleFieldChange("currency", value);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-24">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label
            htmlFor="split-type-select"
            className="mb-1 block text-sm font-medium"
          >
            Split Type
          </label>
          <Select
            value={editedExpense.splitType}
            onValueChange={(value: SplitType) => {
              if (value !== editedExpense.splitType) {
                handleSplitTypeChange(value);
              }
            }}
          >
            <SelectTrigger id="split-type-select" className="w-full">
              <SelectValue placeholder="Split Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EQUAL">Equal</SelectItem>
              <SelectItem value="UNEQUAL">Unequal</SelectItem>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Use the centralized SplitEditor component */}
        {participants.length > 0 && (
          <SplitEditor
            participants={participants}
            splitType={editedExpense.splitType}
            totalAmount={editedExpense.amount}
            currency={editedExpense.currency}
            initialSplits={editedExpense.splits}
            onSplitsChange={(newSplits) => {
              // Only update if there's an actual change to prevent loops
              const currentSplitsStr = JSON.stringify(editedExpense.splits);
              const newSplitsStr = JSON.stringify(newSplits);
              if (currentSplitsStr !== newSplitsStr) {
                handleSplitsChange(newSplits);
              }
            }}
            currentUserId={currentUser.id}
          />
        )}

        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium">
            Date
          </label>
          <DatePicker
            date={editedExpense.date ? new Date(editedExpense.date) : undefined}
            setDate={(date) =>
              handleFieldChange(
                "date",
                date ? date.toISOString().split("T")[0] : editedExpense.date
              )
            }
          />
        </div>

        {/* Add payment section for editing */}
        <div className="mt-6">
          <h3 className="mb-2 font-medium">Who paid?</h3>
          <div className="space-y-3">
            {participants.map((participant) => {
              const payment = editedExpense.payments?.find(
                (p) => p.userId === participant.id
              );

              return (
                <div
                  key={`payment-${participant.id}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <label
                      className="text-sm font-medium"
                      htmlFor={`payment-${participant.id}`}
                    >
                      {participant.id === currentUser.id
                        ? "You"
                        : participant.name}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{editedExpense.currency}</span>
                    <input
                      id={`payment-${participant.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={payment ? payment.amount : ""}
                      onChange={(e) =>
                        handlePaymentChange(participant.id, e.target.value)
                      }
                      className="w-20 rounded border px-2 py-1 text-right"
                    />
                  </div>
                </div>
              );
            })}

            {!validatePayments() && (
              <div className="mt-1 text-sm text-red-500">
                Total payments must equal the expense amount
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </div>
    </form>
  );
}
