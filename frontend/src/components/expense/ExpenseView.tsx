import { Expense } from "@/types/expense";
import { useExpenseStore } from "@/store/expense-store";
import { useGroupsStore } from "@/store/groups-store";
import { Button } from "@/components/ui/button";
import DateDisplay from "@/components/DateDisplay";
import { formatCurrency } from "@/lib/utils";
import SettlementsList from "./SettlementsList";

interface ExpenseViewProps {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  onClose?: () => void;
}

export default function ExpenseView({
  expense,
  onEdit,
  onDelete,
  onClose,
}: ExpenseViewProps) {
  const { currentUser } = useExpenseStore();
  const { groups } = useGroupsStore();

  // Get user name by ID
  const getUserName = (userId: string): string => {
    return getUser(userId).name;
  };

  // Get the User object for a userId
  const getUser = (userId: string) => {
    return useExpenseStore.getState().getUserById(userId);
  };

  // Get group name by ID
  const getGroupName = (groupId: string): string => {
    // Get groups from the dedicated groups store
    return groups.find((g) => g.id === groupId)?.name || "Unknown Group";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-brand text-2xl font-semibold">
            {formatCurrency(expense.amount, expense.currency)}
          </h2>
          <p className="text-muted-foreground/70 mt-1 text-sm">
            <DateDisplay date={expense.date} />
            {expense.groupId && (
              <>
                {" • "}
                <span className="text-brand-subtle">
                  {getGroupName(expense.groupId)}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {expense.description && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            DESCRIPTION
          </h3>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {expense.description}
          </p>
        </div>
      )}

      {/* Payment Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          PAYMENTS
        </h3>
        <div className="mt-2 space-y-2">
          {expense.payments && expense.payments.length > 0 ? (
            expense.payments.map((payment, index) => (
              <div
                key={`payment-view-${index}`}
                className="flex justify-between"
              >
                <span className="text-sm">
                  {payment.userId === currentUser.id
                    ? "You"
                    : getUserName(payment.userId)}
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(payment.amount, expense.currency)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">
              {expense.paidBy === currentUser.id
                ? "You"
                : getUserName(expense.paidBy)}{" "}
              paid the full amount
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          SPLIT TYPE
        </h3>
        <p className="mt-1 capitalize text-gray-700 dark:text-gray-300">
          {expense.splitType.toLowerCase()}
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          SPLIT DETAILS
        </h3>
        <div className="mt-2 space-y-2">
          {expense.splits.map((split) => (
            <div
              key={split.userId}
              className="flex items-center justify-between"
            >
              <span className="text-sm">
                {split.userId === currentUser.id
                  ? "You"
                  : getUserName(split.userId)}
              </span>
              <div className="text-right text-sm font-medium">
                <div>{formatCurrency(split.amount, expense.currency)}</div>
                {expense.splitType === "PERCENTAGE" && (
                  <div className="text-xs text-gray-500">
                    {split.percentage}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use the extracted SettlementsList component */}
      {expense.settlements && expense.settlements.length > 0 && (
        <SettlementsList expense={expense} onPaymentComplete={onClose} />
      )}
    </div>
  );
}
