import { useCallback } from "react";
import { Split } from "@/types/expense";

export function usePercentageSplitValidation() {
  const validatePercentageSplits = useCallback((splits: Split[]): boolean => {
    if (!splits.length) return false;

    const totalPercentage = splits.reduce((sum, split) => {
      return sum + (split.percentage || 0);
    }, 0);

    return Math.abs(totalPercentage - 100) < 0.01;
  }, []);

  const calculateRemainingPercentage = useCallback(
    (splits: Split[], excludeUserId?: string): number => {
      const totalPercentage = splits.reduce((sum, split) => {
        if (split.userId !== excludeUserId) {
          return sum + (split.percentage || 0);
        }
        return sum;
      }, 0);

      return Math.max(0, 100 - totalPercentage);
    },
    []
  );

  const distributeRemainingPercentage = useCallback(
    (splits: Split[], excludeUserId?: string): Split[] => {
      const remainingPercentage = calculateRemainingPercentage(
        splits,
        excludeUserId
      );
      if (remainingPercentage <= 0) return splits;

      const eligibleSplits = splits.filter(
        (split) => split.userId !== excludeUserId && !split.percentage
      );
      if (!eligibleSplits.length) return splits;

      const percentagePerSplit = remainingPercentage / eligibleSplits.length;

      return splits.map((split) => {
        if (split.userId !== excludeUserId && !split.percentage) {
          return { ...split, percentage: percentagePerSplit };
        }
        return split;
      });
    },
    [calculateRemainingPercentage]
  );

  // New function to handle smart percentage split logic
  const handleSmartPercentageSplit = useCallback(
    (
      splits: Split[],
      changedUserId: string,
      newPercentage: number,
      manuallyEditedFields: Set<string>
    ): Split[] => {
      // Don't allow negative percentages
      if (newPercentage < 0) {
        newPercentage = 0;
      }

      // Cap at 100%
      if (newPercentage > 100) {
        newPercentage = 100;
      }

      // Create a copy of splits to work with
      const updatedSplits = [...splits];

      // Find the split that was changed
      const changedSplitIndex = updatedSplits.findIndex(
        (s) => s.userId === changedUserId
      );

      if (changedSplitIndex === -1) return splits;

      // Update the changed split
      const oldPercentage = updatedSplits[changedSplitIndex].percentage || 0;
      updatedSplits[changedSplitIndex] = {
        ...updatedSplits[changedSplitIndex],
        percentage: newPercentage,
      };

      // Calculate the difference to distribute
      const diff = oldPercentage - newPercentage;

      // If no difference or there's only one split, no need to adjust others
      if (Math.abs(diff) < 0.001 || updatedSplits.length <= 1) {
        return updatedSplits;
      }

      // Get non-changed splits that haven't been manually edited
      const nonChangedSplitsIndices = updatedSplits
        .map((_, index) => index)
        .filter(
          (index) =>
            index !== changedSplitIndex &&
            !manuallyEditedFields.has(updatedSplits[index].userId)
        );

      // If all other splits have been manually edited, we'll have to adjust the manually edited ones too
      // Prefer to distribute to non-manually edited fields
      const indicesToAdjust =
        nonChangedSplitsIndices.length > 0
          ? nonChangedSplitsIndices
          : updatedSplits
              .map((_, index) => index)
              .filter((index) => index !== changedSplitIndex);

      if (indicesToAdjust.length === 0) {
        return updatedSplits; // No splits to adjust
      }

      // Distribute the difference evenly
      const adjustmentPerSplit = diff / indicesToAdjust.length;

      for (const index of indicesToAdjust) {
        const currentPercentage = updatedSplits[index].percentage || 0;
        const newAdjustedPercentage = Math.max(
          0,
          currentPercentage + adjustmentPerSplit
        );

        updatedSplits[index] = {
          ...updatedSplits[index],
          percentage: newAdjustedPercentage,
        };
      }

      // Ensure total is exactly 100%
      const finalTotal = updatedSplits.reduce(
        (sum, split) => sum + (split.percentage || 0),
        0
      );

      if (Math.abs(finalTotal - 100) >= 0.01) {
        // Find a split to adjust to make total exactly 100%
        const adjustmentIndex = indicesToAdjust[0];
        if (adjustmentIndex !== undefined) {
          const currentPercentage =
            updatedSplits[adjustmentIndex].percentage || 0;
          updatedSplits[adjustmentIndex] = {
            ...updatedSplits[adjustmentIndex],
            percentage: currentPercentage + (100 - finalTotal),
          };
        }
      }

      return updatedSplits;
    },
    []
  );

  return {
    validatePercentageSplits,
    calculateRemainingPercentage,
    distributeRemainingPercentage,
    handleSmartPercentageSplit,
  };
}
