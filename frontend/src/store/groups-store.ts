import { create } from 'zustand';
import { Group } from '@/types/group';
import { User } from '@/types/expense';
import { db, addToSyncQueue } from '@/lib/db';

interface GroupsState {
  groups: Group[];
  isLoading: boolean;
  loadGroups: () => Promise<void>;
  addGroup: (group: Group) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  addMemberToGroup: (groupId: string, member: User) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
}

// Mock groups data
const mockGroups: Group[] = [
  {
    id: 'group-1',
    name: 'Weekend Trip',
    description: 'Expenses for our weekend getaway',
    members: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        defaultCurrency: 'USD',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        defaultCurrency: 'USD',
      },
    ],
    createdAt: '2024-03-15',
    createdBy: '1',
    totalBalance: 250.00,
    currency: 'USD',
  },
  {
    id: 'group-2',
    name: 'Roommates',
    description: 'Monthly apartment expenses',
    members: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        defaultCurrency: 'USD',
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        defaultCurrency: 'EUR',
      },
    ],
    createdAt: '2024-03-10',
    createdBy: '3',
    totalBalance: 800.00,
    currency: 'USD',
  },
];

// Helper function to generate a unique ID 
const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  isLoading: false,
  
  loadGroups: async () => {
    set({ isLoading: true });
    try {
      // Check if we need to load dummy groups
      const groupsCount = await db.groups.count();
      if (groupsCount === 0) {
        console.log('Loading dummy groups into IndexedDB...');
        // Add dummy groups
        for (const group of mockGroups) {
          await db.groups.add({
            ...group,
            _synced: true,
            _lastModified: Date.now()
          });
        }
      }
      
      // Load groups from IndexedDB
      const groups = await db.groups.toArray();
      set({ groups, isLoading: false });
    } catch (error) {
      console.error('Failed to load groups:', error);
      set({ isLoading: false });
    }
  },
  
  addGroup: async (group) => {
    try {
      // Generate a unique ID if not provided
      let uniqueId = group.id || generateUniqueId('group');
      
      // Ensure the ID is truly unique
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 5) {
        // Check if a group with this ID already exists
        const existingGroup = await db.groups.get(uniqueId);
        
        if (existingGroup) {
          // ID collision detected, generate a new ID
          console.log(`ID collision detected for ${uniqueId}, generating new ID...`);
          uniqueId = generateUniqueId('group');
          attempts++;
        } else {
          isUnique = true;
        }
      }
      
      if (!isUnique) {
        throw new Error('Failed to generate a unique group ID after multiple attempts');
      }
      
      // Create the group with the unique ID
      const groupToAdd = {
        ...group,
        id: uniqueId
      };
      
      // Add to IndexedDB with sync metadata
      const groupWithMeta = {
        ...groupToAdd,
        _synced: false,
        _lastModified: Date.now()
      };
      
      await db.groups.add(groupWithMeta);
      
      // Add to sync queue
      await addToSyncQueue('groups', 'add', groupToAdd as unknown as Record<string, unknown>);
      
      // Update state
      set((state) => ({
        groups: [...state.groups, groupToAdd],
      }));
    } catch (error) {
      console.error('Failed to add group:', error);
      throw error;
    }
  },
  
  updateGroup: async (groupId, updates) => {
    try {
      // Update in IndexedDB
      await db.groups.update(groupId, {
        ...updates,
        _synced: false,
        _lastModified: Date.now()
      });
      
      // Add to sync queue
      const currentGroup = get().groups.find(g => g.id === groupId);
      if (currentGroup) {
        const updatedGroup = { ...currentGroup, ...updates };
        await addToSyncQueue('groups', 'update', updatedGroup as unknown as Record<string, unknown>);
      }
      
      // Update state
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === groupId ? { ...group, ...updates } : group
        ),
      }));
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  },
  
  removeGroup: async (groupId) => {
    try {
      // Get the group before deleting
      const group = get().groups.find(g => g.id === groupId);
      
      // Delete from IndexedDB
      await db.groups.delete(groupId);
      
      // Add to sync queue
      if (group) {
        await addToSyncQueue('groups', 'delete', { id: groupId } as unknown as Record<string, unknown>);
      }
      
      // Update state
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== groupId),
      }));
    } catch (error) {
      console.error('Failed to remove group:', error);
      throw error;
    }
  },
  
  addMemberToGroup: async (groupId, member) => {
    try {
      const currentGroup = get().groups.find(g => g.id === groupId);
      if (!currentGroup) throw new Error('Group not found');
      
      const updatedMembers = [...currentGroup.members, member];
      
      // Update the group with new members
      await useGroupsStore.getState().updateGroup(groupId, { members: updatedMembers });
    } catch (error) {
      console.error('Failed to add member to group:', error);
      throw error;
    }
  },
  
  removeMemberFromGroup: async (groupId, memberId) => {
    try {
      const currentGroup = get().groups.find(g => g.id === groupId);
      if (!currentGroup) throw new Error('Group not found');
      
      const updatedMembers = currentGroup.members.filter(m => m.id !== memberId);
      
      // Update the group with new members
      await useGroupsStore.getState().updateGroup(groupId, { members: updatedMembers });
    } catch (error) {
      console.error('Failed to remove member from group:', error);
      throw error;
    }
  },
})); 