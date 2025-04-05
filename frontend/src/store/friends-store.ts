import { create } from "zustand";
import { Friend } from "@/types/group";
import { db, addToSyncQueue } from "@/lib/db";

interface FriendsState {
  friends: Friend[];
  isLoading: boolean;
  loadFriends: () => Promise<void>;
  addFriend: (friend: Friend) => Promise<void>;
  updateFriendStatus: (
    friendId: string,
    status: Friend["status"]
  ) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

// Mock friends data
const mockFriends: Friend[] = [
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    defaultCurrency: "USD",
    status: "ACCEPTED",
    addedAt: "2024-03-01",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    defaultCurrency: "EUR",
    status: "ACCEPTED",
    addedAt: "2024-03-05",
  },
  {
    id: "4",
    name: "Alice Williams",
    email: "alice@example.com",
    defaultCurrency: "GBP",
    status: "PENDING",
    addedAt: "2024-03-10",
  },
];

// Helper function to generate a unique ID
const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  isLoading: false,

  loadFriends: async () => {
    set({ isLoading: true });
    try {
      // Check if we need to load dummy friends
      const friendsCount = await db.friends.count();
      if (friendsCount === 0) {
        console.log("Loading dummy friends into IndexedDB...");
        // Add dummy friends
        for (const friend of mockFriends) {
          await db.friends.add({
            ...friend,
            _synced: true,
            _lastModified: Date.now(),
          });
        }
      }

      // Load friends from IndexedDB
      const friends = await db.friends.toArray();
      set({ friends, isLoading: false });
    } catch (error) {
      console.error("Failed to load friends:", error);
      set({ isLoading: false });
    }
  },

  addFriend: async (friend) => {
    try {
      // Generate a unique ID if not provided
      let uniqueId = friend.id || generateUniqueId("friend");

      // Ensure the ID is truly unique
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        // Check if a friend with this ID already exists
        const existingFriend = await db.friends.get(uniqueId);

        if (existingFriend) {
          // ID collision detected, generate a new ID
          console.log(
            `ID collision detected for ${uniqueId}, generating new ID...`
          );
          uniqueId = generateUniqueId("friend");
          attempts++;
        } else {
          isUnique = true;
        }
      }

      if (!isUnique) {
        throw new Error(
          "Failed to generate a unique friend ID after multiple attempts"
        );
      }

      // Create the friend with the unique ID
      const friendToAdd = {
        ...friend,
        id: uniqueId,
      };

      // Add to IndexedDB with sync metadata
      const friendWithMeta = {
        ...friendToAdd,
        _synced: false,
        _lastModified: Date.now(),
      };

      await db.friends.add(friendWithMeta);

      // Add to sync queue
      await addToSyncQueue(
        "friends",
        "add",
        friendToAdd as unknown as Record<string, unknown>
      );

      // Update state
      set((state) => ({
        friends: [...state.friends, friendToAdd],
      }));
    } catch (error) {
      console.error("Failed to add friend:", error);
      throw error;
    }
  },

  updateFriendStatus: async (friendId, status) => {
    try {
      // Update in IndexedDB
      await db.friends.update(friendId, {
        status,
        _synced: false,
        _lastModified: Date.now(),
      });

      // Add to sync queue
      const currentFriend = get().friends.find((f) => f.id === friendId);
      if (currentFriend) {
        const updatedFriend = { ...currentFriend, status };
        await addToSyncQueue(
          "friends",
          "update",
          updatedFriend as unknown as Record<string, unknown>
        );
      }

      // Update state
      set((state) => ({
        friends: state.friends.map((friend) =>
          friend.id === friendId ? { ...friend, status } : friend
        ),
      }));
    } catch (error) {
      console.error("Failed to update friend status:", error);
      throw error;
    }
  },

  removeFriend: async (friendId) => {
    try {
      // Get the friend before deleting
      const friend = get().friends.find((f) => f.id === friendId);

      // Delete from IndexedDB
      await db.friends.delete(friendId);

      // Add to sync queue
      if (friend) {
        await addToSyncQueue("friends", "delete", {
          id: friendId,
        } as unknown as Record<string, unknown>);
      }

      // Update state
      set((state) => ({
        friends: state.friends.filter((friend) => friend.id !== friendId),
      }));
    } catch (error) {
      console.error("Failed to remove friend:", error);
      throw error;
    }
  },
}));
