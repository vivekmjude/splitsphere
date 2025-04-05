"use client";

import { useState, memo } from "react";
import { useGroupsStore } from "@/store/groups-store";
import { useFriendsStore } from "@/store/friends-store";
import { Group } from "@/types/group";
import { Expense } from "@/types/expense";
import ExpenseDialog from "@/components/ExpenseDialog";
import ExpenseList from "@/components/ExpenseList";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { useExpenseStore } from "@/store/expense-store";

const GroupsContent = memo(function GroupsContent() {
  const { groups, addGroup, removeGroup, isLoading: isLoadingGroups } = useGroupsStore();
  const { friends } = useFriendsStore();
  const { expenses, currentUser, addExpense, isLoading: isLoadingExpenses } = useExpenseStore();
  
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    selectedMembers: [] as string[],
  });
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  const acceptedFriends = friends.filter((friend) => friend.status === "ACCEPTED");
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
      currency: "USD",
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
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Groups</h1>
        <button
          onClick={() => setShowAddGroup(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          Create Group
        </button>
      </div>

      {showAddGroup && (
        <Card elevated className="mb-8">
          <CardContent className="pt-4">
            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Group Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full p-2 rounded-md border border-input bg-background"
                  placeholder="Weekend Trip"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full p-2 rounded-md border border-input bg-background"
                  placeholder="Expenses for our weekend getaway"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Members</label>
                <div className="space-y-2">
                  {acceptedFriends.map((friend) => (
                    <label key={friend.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newGroup.selectedMembers.includes(friend.id)}
                        onChange={(e) => {
                          const members = e.target.checked
                            ? [...newGroup.selectedMembers, friend.id]
                            : newGroup.selectedMembers.filter((id) => id !== friend.id);
                          setNewGroup({ ...newGroup, selectedMembers: members });
                        }}
                        className="rounded border-input"
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
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Create Group
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading groups...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.length === 0 ? (
            <p className="text-center text-muted-foreground">No groups yet. Create one to get started.</p>
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
                    <div className="flex flex-wrap gap-2 mt-1">
                      {group.members.map((member) => (
                        <span
                          key={member.id}
                          className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground"
                        >
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div className="text-right">
                      <p className="font-medium text-lg">
                        Total Balance: ${group.totalBalance.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">{group.currency}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setShowExpenseDialog(true);
                        }}
                        className="text-sm font-medium text-primary hover:text-primary/90"
                      >
                        Add Expense
                      </button>
                      <button
                        onClick={() => removeGroup(group.id)}
                        className="text-sm font-medium text-destructive hover:text-destructive/80 dark:text-destructive dark:hover:text-destructive/80"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Recent Expenses</h4>
                    <ExpenseList
                      expenses={expenses.filter((e) => e.groupId === group.id)}
                      showGroupName={false}
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