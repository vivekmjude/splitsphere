"use client";

import { useState, memo } from "react";
import { useGroupsStore } from "@/store/groups-store";
import { useFriendsStore } from "@/store/friends-store";
import { Group } from "@/types/group";
import { Expense, Currency } from "@/types/expense";
import ExpenseDialog from "@/components/ExpenseDialog";
import ExpenseList from "@/components/ExpenseList";
import BalanceSummary from "@/components/BalanceSummary";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useExpenseStore } from "@/store/expense-store";
import { formatCurrency } from "@/lib/utils";

const GroupsContent = memo(function GroupsContent() {
  const {
    groups,
    addGroup,
    removeGroup,
    isLoading: isLoadingGroups,
  } = useGroupsStore();
  const { friends } = useFriendsStore();
  const {
    expenses,
    currentUser,
    addExpense,
    isLoading: isLoadingExpenses,
  } = useExpenseStore();

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    selectedMembers: [] as string[],
  });
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  const acceptedFriends = friends.filter(
    (friend) => friend.status === "ACCEPTED"
  );
  const isLoading = isLoadingGroups || isLoadingExpenses;

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedFriends = acceptedFriends.filter((friend) =>
      newGroup.selectedMembers.includes(friend.id)
    );

    const group: Group = {
      id: `group-${Date.now()}`,
      name: newGroup.name,
      description: newGroup.description,
      members: [currentUser, ...selectedFriends],
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      totalBalance: 0,
      currency: "USD" as Currency,
    };

    try {
      await addGroup(group);
      setNewGroup({
        name: "",
        description: "",
        selectedMembers: [],
      });
      setShowAddGroup(false);
    } catch (error) {
      console.error("Failed to add group:", error);
      // Could show an error toast here
    }
  };

  const handleAddExpense = async (expense: Expense) => {
    try {
      await addExpense(expense);
      setShowExpenseDialog(false);
    } catch (error) {
      console.error("Failed to add expense:", error);
      // Could show an error toast here
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await useGroupsStore.getState().recalculateAllGroupBalances();
            }}
            className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm"
          >
            Recalculate Balances
          </button>
          <button
            onClick={() => setShowAddGroup(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2"
          >
            Create Group
          </button>
        </div>
      </div>

      {showAddGroup && (
        <Card elevated className="mb-8">
          <CardContent className="pt-4">
            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium"
                >
                  Group Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  className="border-input bg-background w-full rounded-md border p-2"
                  placeholder="Weekend Trip"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="mb-1 block text-sm font-medium"
                >
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  className="border-input bg-background w-full rounded-md border p-2"
                  placeholder="Expenses for our weekend getaway"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Members
                </label>
                <div className="space-y-2">
                  {acceptedFriends.map((friend) => (
                    <label key={friend.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newGroup.selectedMembers.includes(friend.id)}
                        onChange={(e) => {
                          const members = e.target.checked
                            ? [...newGroup.selectedMembers, friend.id]
                            : newGroup.selectedMembers.filter(
                                (id) => id !== friend.id
                              );
                          setNewGroup({
                            ...newGroup,
                            selectedMembers: members,
                          });
                        }}
                        className="border-input rounded"
                      />
                      <span>{friend.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroup(false)}
                  className="border-border hover:bg-muted rounded-lg border px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2"
                >
                  Create Group
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p>Loading groups...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center">
              No groups yet. Create one to get started.
            </p>
          ) : (
            groups.map((group) => (
              <Card key={group.id} elevated>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                  <div className="mt-2">
                    <p className="text-sm font-medium">Members:</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {group.members.map((member) => (
                        <span
                          key={member.id}
                          className="bg-accent text-accent-foreground rounded-full px-2 py-1 text-xs"
                        >
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setShowExpenseDialog(true);
                        }}
                        className="text-primary hover:text-primary/90 text-sm font-medium"
                      >
                        Add Expense
                      </button>
                      <button
                        onClick={() => removeGroup(group.id)}
                        className="text-destructive hover:text-destructive/80 dark:text-destructive dark:hover:text-destructive/80 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-medium">
                        Total Amount:{" "}
                        {formatCurrency(
                          group.totalBalance,
                          group.currency as Currency
                        )}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {group.currency}
                      </p>
                    </div>
                  </div>

                  {/* Detailed balance summary */}
                  <div className="mb-4">
                    <BalanceSummary
                      expenses={expenses.filter((e) => e.groupId === group.id)}
                      userId={currentUser.id}
                      title={`${group.name} Balance`}
                      compact={true}
                      showIfEmpty={true}
                    />
                  </div>

                  <div className="mt-6">
                    <h4 className="mb-2 text-sm font-medium">
                      Recent Expenses
                    </h4>
                    <ExpenseList
                      expenses={expenses.filter((e) => e.groupId === group.id)}
                      showGroupName={false}
                      limit={5}
                      showExpand={true}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <ExpenseDialog
        open={showExpenseDialog}
        onClose={() => {
          setShowExpenseDialog(false);
          setSelectedGroupId(null);
        }}
        onSubmit={handleAddExpense}
        groupId={selectedGroupId || undefined}
        currentUser={currentUser}
      />
    </div>
  );
});

export default GroupsContent;
