"use client";

import { useState, memo } from "react";
import { useFriendsStore } from "@/store/friends-store";
import { Friend } from "@/types/group";
import { Card, CardContent } from "@/components/ui/card";

const FriendsContent = memo(function FriendsContent() {
  const { friends, addFriend, updateFriendStatus, removeFriend, isLoading } = useFriendsStore();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create the friend object
      const newFriend: Friend = {
        id: `temp-${Date.now()}`,
        name: newFriendEmail.split("@")[0],
        email: newFriendEmail,
        defaultCurrency: "USD",
        status: "PENDING",
        addedAt: new Date().toISOString(),
      };
      
      await addFriend(newFriend);
      setNewFriendEmail("");
      setShowAddFriend(false);
    } catch (error) {
      console.error("Failed to add friend:", error);
      // Could show an error toast here
    }
  };

  const handleUpdateStatus = async (friendId: string, status: Friend['status']) => {
    try {
      await updateFriendStatus(friendId, status);
    } catch (error) {
      console.error(`Failed to update friend status to ${status}:`, error);
      // Could show an error toast here
    }
  };
  
  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
    } catch (error) {
      console.error("Failed to remove friend:", error);
      // Could show an error toast here
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Friends</h1>
        <button
          onClick={() => setShowAddFriend(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          Add Friend
        </button>
      </div>

      {showAddFriend && (
        <Card elevated className="mb-8">
          <CardContent className="pt-4">
            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Friend&apos;s Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="w-full p-2 rounded-md border border-input bg-background"
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading friends...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <p className="text-center text-muted-foreground">No friends yet. Add someone to get started.</p>
          ) : (
            friends.map((friend) => (
              <Card key={friend.id} elevated>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-medium text-lg">{friend.name}</h3>
                      <p className="text-sm text-muted-foreground">{friend.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${friend.status === "ACCEPTED"
                              ? "bg-success/10 text-success dark:bg-success/30 dark:text-success-foreground"
                              : friend.status === "PENDING"
                              ? "bg-secondary/10 text-secondary dark:bg-secondary/30 dark:text-secondary-foreground"
                              : "bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive-foreground"
                          }`}
                      >
                        {friend.status.charAt(0) + friend.status.slice(1).toLowerCase()}
                      </span>
                      {friend.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(friend.id, "ACCEPTED")}
                            className="text-sm font-medium text-success hover:text-success/80 dark:text-success dark:hover:text-success/80"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(friend.id, "REJECTED")}
                            className="text-sm font-medium text-destructive hover:text-destructive/80 dark:text-destructive dark:hover:text-destructive/80"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="text-sm font-medium px-2 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
});

export default FriendsContent; 