import { Split, User, SplitType, Currency } from "@/types/expense";
import { Input } from "@/components/ui/input";
import { useSplitLogic } from "@/hooks/useSplitLogic";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

interface SplitEditorProps {
  // Common props
  participants: User[];
  splitType: SplitType;
  totalAmount: number;
  currency: Currency;
  onSplitsChange: (splits: Split[]) => void;

  // Optional initial values
  initialSplits?: Split[];
  currentUserId: string;
}

export default function SplitEditor({
  participants,
  splitType,
  totalAmount,
  currency,
  initialSplits,
  onSplitsChange,
  currentUserId,
}: SplitEditorProps) {
  const {
    validatePercentageSplits,
    handleSmartPercentageSplit,
    handleSmartAmountSplit,
  } = useSplitLogic();

  // Track which fields have been manually edited
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(
    new Set()
  );

  // Local state for splits
  const [splits, setSplits] = useState<Split[]>([]);

  // Use a ref to track previous props to avoid unnecessary updates
  const prevPropsRef = useRef({
    splitType,
    totalAmount,
    participantsLength: participants.length,
  });

  // Initialize splits when component mounts or when key inputs change
  useEffect(() => {
    // Skip updates if nothing important has changed
    if (
      prevPropsRef.current.splitType === splitType &&
      prevPropsRef.current.totalAmount === totalAmount &&
      prevPropsRef.current.participantsLength === participants.length &&
      splits.length > 0
    ) {
      return;
    }

    // Update ref values
    prevPropsRef.current = {
      splitType,
      totalAmount,
      participantsLength: participants.length,
    };

    if (!participants.length || !totalAmount) return;

    // If we have initialSplits and they match our participant count, use them
    if (initialSplits && initialSplits.length === participants.length) {
      setSplits(
        initialSplits.map((split) => ({
          ...split,
          amount:
            splitType === "PERCENTAGE"
              ? (totalAmount * (split.percentage || 0)) / 100
              : split.amount,
        }))
      );
      return;
    }

    // Otherwise create new splits based on the split type
    let newSplits: Split[] = [];

    if (splitType === "EQUAL") {
      // For equal splits, distribute amounts evenly
      const equalAmount = totalAmount / participants.length;
      newSplits = participants.map((user) => ({
        userId: user.id,
        amount: equalAmount,
      }));
    } else if (splitType === "PERCENTAGE") {
      // For percentage splits, start with empty fields (0%)
      newSplits = participants.map((user) => ({
        userId: user.id,
        amount: 0,
        percentage: 0,
      }));
    } else {
      // For UNEQUAL splits, start with empty fields (0 amount)
      newSplits = participants.map((user) => ({
        userId: user.id,
        amount: 0,
      }));
    }

    setSplits(newSplits);
    setManuallyEditedFields(new Set()); // Reset manually edited fields
  }, [participants, splitType, totalAmount, initialSplits, splits.length]);

  // Update parent component when splits change
  const lastSplitsRef = useRef("");

  useEffect(() => {
    if (splits.length > 0) {
      // Prevent unnecessary updates by checking for actual changes
      const currentSplitsStr = JSON.stringify(splits);

      if (lastSplitsRef.current !== currentSplitsStr) {
        lastSplitsRef.current = currentSplitsStr;
        onSplitsChange(splits);
      }
    }
  }, [splits, onSplitsChange]);

  // Handle percentage change for percentage splits
  const handlePercentageChange = (userId: string, newPercentage: number) => {
    // Validation
    if (isNaN(newPercentage)) newPercentage = 0;
    if (newPercentage < 0) newPercentage = 0;
    if (newPercentage > 100) newPercentage = 100;

    // Check if the value actually changed to prevent unnecessary updates
    const currentSplit = splits.find((split) => split.userId === userId);
    if (
      currentSplit &&
      Math.abs((currentSplit.percentage || 0) - newPercentage) < 0.01
    ) {
      return; // Don't update if value hasn't changed significantly
    }

    // Mark this field as manually edited
    setManuallyEditedFields((prev) => {
      const updated = new Set(prev);
      updated.add(userId);
      return updated;
    });

    // Use the smart percentage distribution
    const updatedSplits = handleSmartPercentageSplit(
      splits,
      userId,
      newPercentage,
      manuallyEditedFields
    );

    // Update amounts based on percentages
    const splitsWithAmounts = updatedSplits.map((split) => ({
      ...split,
      amount: (totalAmount * (split.percentage || 0)) / 100,
    }));

    setSplits(splitsWithAmounts);
  };

  // Handle amount change for unequal splits
  const handleAmountChange = (userId: string, newAmount: number) => {
    // Validation
    if (isNaN(newAmount)) newAmount = 0;
    if (newAmount < 0) newAmount = 0;
    if (newAmount > totalAmount) newAmount = totalAmount;

    // Check if the value actually changed to prevent unnecessary updates
    const currentSplit = splits.find((split) => split.userId === userId);
    if (currentSplit && Math.abs(currentSplit.amount - newAmount) < 0.01) {
      return; // Don't update if value hasn't changed significantly
    }

    // Mark this field as manually edited
    setManuallyEditedFields((prev) => {
      const updated = new Set(prev);
      updated.add(userId);
      return updated;
    });

    // Use the smart amount distribution
    const updatedSplits = handleSmartAmountSplit(
      splits,
      userId,
      newAmount,
      totalAmount,
      manuallyEditedFields
    );

    setSplits(updatedSplits);
  };

  // Get user name from user ID
  const getUserName = (userId: string): string => {
    const user = participants.find((p) => p.id === userId);
    return userId === currentUserId ? "You" : user?.name || "Unknown";
  };

  // Render the appropriate split editor based on splitType
  if (splitType === "EQUAL") {
    return (
      <div>
        <h4 className="mb-2 text-sm font-medium">Equal Split</h4>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between"
            >
              <span className="text-sm">{getUserName(participant.id)}</span>
              <span className="text-sm font-medium">
                {formatCurrency(totalAmount / participants.length, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (splitType === "PERCENTAGE") {
    return (
      <div>
        <h4 className="mb-2 text-sm font-medium">Split Percentages</h4>
        <div className="space-y-2">
          {participants.length === 1 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm">{getUserName(participants[0].id)}</span>
              <span className="text-sm font-medium">100%</span>
            </div>
          ) : (
            <>
              {splits.map((split) => (
                <div
                  key={split.userId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex-grow text-sm">
                    {getUserName(split.userId)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="w-20 text-right"
                      value={split.percentage || 0}
                      onChange={(e) => {
                        const newPercentage = parseFloat(e.target.value) || 0;
                        handlePercentageChange(split.userId, newPercentage);
                      }}
                    />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              ))}

              {/* Show total percentage and validation */}
              <div className="text-muted-foreground mt-2 flex justify-between text-sm">
                <span>Total:</span>
                <span
                  className={
                    Math.abs(
                      splits.reduce(
                        (sum, split) => sum + (split.percentage || 0),
                        0
                      ) - 100
                    ) > 0.01
                      ? "text-red-500"
                      : ""
                  }
                >
                  {splits
                    .reduce((sum, split) => sum + (split.percentage || 0), 0)
                    .toFixed(2)}
                  %
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // UNEQUAL split
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">Custom Split Amounts</h4>
      <div className="space-y-2">
        {participants.length === 1 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm">{getUserName(participants[0].id)}</span>
            <span className="text-sm font-medium">
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        ) : (
          <>
            {splits.map((split) => (
              <div
                key={split.userId}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex-grow text-sm">
                  {getUserName(split.userId)}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-24 text-right"
                  value={split.amount || ""}
                  onChange={(e) => {
                    const newAmount = parseFloat(e.target.value) || 0;
                    handleAmountChange(split.userId, newAmount);
                  }}
                />
              </div>
            ))}

            {/* Show allocated and remaining amounts */}
            <div className="mt-3 border-t pt-2 text-sm">
              <div className="text-muted-foreground flex justify-between">
                <span>Allocated:</span>
                <span>
                  {formatCurrency(
                    splits.reduce((sum, split) => sum + split.amount, 0),
                    currency
                  )}
                </span>
              </div>

              <div className="flex justify-between font-medium">
                <span>Remaining to allocate:</span>
                <span
                  className={
                    Math.abs(
                      totalAmount -
                        splits.reduce((sum, split) => sum + split.amount, 0)
                    ) > 0.01
                      ? "text-red-500"
                      : "text-green-500"
                  }
                >
                  {formatCurrency(
                    Math.max(
                      0,
                      totalAmount -
                        splits.reduce((sum, split) => sum + split.amount, 0)
                    ),
                    currency
                  )}
                </span>
              </div>

              <div className="mt-2 flex justify-between">
                <span className="font-medium">Total expense:</span>
                <span className="font-medium">
                  {formatCurrency(totalAmount, currency)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
