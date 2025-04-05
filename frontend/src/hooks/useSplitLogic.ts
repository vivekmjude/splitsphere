import { Split } from "@/types/expense";

export function useSplitLogic() {
  /**
   * Validates that percentage splits sum to 100%
   */
  const validatePercentageSplits = (splits: Split[]): boolean => {
    const totalPercentage = splits.reduce(
      (sum, split) => sum + (split.percentage || 0),
      0
    );
    return Math.abs(totalPercentage - 100) < 0.01;
  };

  /**
   * Smart distribution of percentage splits when one split is changed
   * Distributes remaining percentage to unedited fields
   */
  const handleSmartPercentageSplit = (
    splits: Split[],
    changedSplitId: string,
    newPercentage: number,
    manuallyEditedFields: Set<string>
  ): Split[] => {
    // Find the index and old percentage of the changed split
    const changedIndex = splits.findIndex((s) => s.userId === changedSplitId);
    if (changedIndex === -1) return splits;

    // Create a copy of the splits to modify
    const updatedSplits = [...splits];
    updatedSplits[changedIndex] = {
      ...updatedSplits[changedIndex],
      percentage: newPercentage,
    };

    // If sum is already 100%, no need to adjust
    const sum = updatedSplits.reduce(
      (s, split) => s + (split.percentage || 0),
      0
    );
    if (Math.abs(sum - 100) < 0.01) return updatedSplits;

    // Find indices of splits that haven't been manually edited (except the current one)
    const nonEditedIndices = updatedSplits
      .map((split, index) => ({
        index,
        isEdited:
          index === changedIndex || manuallyEditedFields.has(split.userId),
      }))
      .filter((item) => !item.isEdited)
      .map((item) => item.index);

    // If there are no unedited splits, we can't distribute
    if (nonEditedIndices.length === 0) {
      // Just scale all other edits proportionally to make room for this one
      const otherIndices = updatedSplits
        .map((split, index) => ({ index, userId: split.userId }))
        .filter((item) => item.userId !== changedSplitId)
        .map((item) => item.index);

      if (otherIndices.length === 0) {
        // Only one split, set to 100%
        updatedSplits[changedIndex].percentage = 100;
        return updatedSplits;
      }

      // Calculate scaling factor
      const totalOtherPercentage = otherIndices.reduce(
        (sum, index) => sum + (updatedSplits[index].percentage || 0),
        0
      );

      // Scale other percentages to fit the remaining percentage
      const targetTotal = 100 - newPercentage;
      const scaleFactor = targetTotal / totalOtherPercentage;

      otherIndices.forEach((index) => {
        updatedSplits[index].percentage =
          (updatedSplits[index].percentage || 0) * scaleFactor;
      });

      return updatedSplits;
    }

    // Calculate how much to distribute among unedited splits
    const requiredAdjustment = 100 - sum;
    const adjustmentPerSplit = requiredAdjustment / nonEditedIndices.length;

    // Distribute the adjustment to unedited splits
    nonEditedIndices.forEach((index) => {
      updatedSplits[index] = {
        ...updatedSplits[index],
        percentage: (updatedSplits[index].percentage || 0) + adjustmentPerSplit,
      };
    });

    // Ensure total is exactly 100%
    const finalSum = updatedSplits.reduce(
      (s, split) => s + (split.percentage || 0),
      0
    );
    if (Math.abs(finalSum - 100) > 0.01) {
      // Apply any tiny remaining difference to the first non-edited split
      const adjustmentIndex =
        nonEditedIndices.length > 0 ? nonEditedIndices[0] : 0;
      updatedSplits[adjustmentIndex].percentage =
        (updatedSplits[adjustmentIndex].percentage || 0) + (100 - finalSum);
    }

    return updatedSplits;
  };

  /**
   * Smart distribution of amount splits when one split is changed
   * Distributes remaining amount to unedited fields
   */
  const handleSmartAmountSplit = (
    splits: Split[],
    changedSplitId: string,
    newAmount: number,
    totalAmount: number,
    manuallyEditedFields: Set<string>
  ): Split[] => {
    // Find the index of the changed split
    const changedIndex = splits.findIndex((s) => s.userId === changedSplitId);
    if (changedIndex === -1) return splits;

    // Create a copy of the splits to modify
    const updatedSplits = [...splits];
    updatedSplits[changedIndex] = {
      ...updatedSplits[changedIndex],
      amount: newAmount,
    };

    // Find indices of splits that haven't been manually edited (except the current one)
    const nonEditedIndices = updatedSplits
      .map((split, index) => ({
        index,
        isEdited:
          index === changedIndex || manuallyEditedFields.has(split.userId),
      }))
      .filter((item) => !item.isEdited)
      .map((item) => item.index);

    // Calculate the remaining amount after accounting for all edited splits
    const totalEditedAmount = updatedSplits.reduce((sum, split, index) => {
      if (index === changedIndex || manuallyEditedFields.has(split.userId)) {
        return sum + split.amount;
      }
      return sum;
    }, 0);

    const remainingAmount = totalAmount - totalEditedAmount;

    // If there are no unedited splits, we can't distribute
    if (nonEditedIndices.length === 0) {
      // If all splits are edited, try to scale the non-changed ones proportionally
      const otherEditedIndices = updatedSplits
        .map((split, index) => ({ index, userId: split.userId }))
        .filter(
          (item) =>
            item.userId !== changedSplitId &&
            manuallyEditedFields.has(item.userId)
        )
        .map((item) => item.index);

      if (otherEditedIndices.length === 0) {
        // Only one split, assign all remaining amount
        return updatedSplits;
      }

      // Calculate scaling factor for other edited fields
      const totalOtherAmount = otherEditedIndices.reduce(
        (sum, index) => sum + updatedSplits[index].amount,
        0
      );

      if (totalOtherAmount <= 0) return updatedSplits;

      // Scale other amounts to fit the remaining amount
      const targetTotal = totalAmount - newAmount;
      const scaleFactor = targetTotal / totalOtherAmount;

      otherEditedIndices.forEach((index) => {
        updatedSplits[index].amount = updatedSplits[index].amount * scaleFactor;
      });

      return updatedSplits;
    }

    // Distribute the remaining amount evenly among unedited splits
    const amountPerSplit = Math.max(
      0,
      remainingAmount / nonEditedIndices.length
    );

    nonEditedIndices.forEach((index) => {
      updatedSplits[index] = {
        ...updatedSplits[index],
        amount: amountPerSplit,
      };
    });

    // Ensure total is exactly equal to the total amount
    const finalSum = updatedSplits.reduce((s, split) => s + split.amount, 0);
    const difference = totalAmount - finalSum;

    if (Math.abs(difference) > 0.01) {
      // Apply any remaining difference to the first non-edited split
      // or to the first split if all are edited
      const adjustmentIndex =
        nonEditedIndices.length > 0
          ? nonEditedIndices[0]
          : updatedSplits.length > 0
            ? 0
            : -1;

      if (adjustmentIndex >= 0) {
        updatedSplits[adjustmentIndex].amount = Math.max(
          0,
          updatedSplits[adjustmentIndex].amount + difference
        );
      }
    }

    return updatedSplits;
  };

  return {
    validatePercentageSplits,
    handleSmartPercentageSplit,
    handleSmartAmountSplit,
  };
}
