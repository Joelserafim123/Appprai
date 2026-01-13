
'use client';

import { create } from 'zustand';
import type { Tent } from '@/lib/types';

interface SearchState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredTents: Tent[];
  setFilteredTents: (tents: Tent[]) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchTerm: '',
  setSearchTerm: (term) => set({ searchTerm: term }),
  filteredTents: [],
  setFilteredTents: (tents) => set({ filteredTents: tents }),
}));
