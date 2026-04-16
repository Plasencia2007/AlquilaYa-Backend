'use client';

import { Search } from 'lucide-react';

export function SidebarSearch() {
  return (
    <div className="px-4 mb-6">
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 group-focus-within:text-primary transition-colors text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar DNI, correo, cuarto"
          className="w-full bg-[#1e293b]/50 border border-outline-variant/10 rounded-xl py-3 pl-12 pr-4 text-xs font-medium text-white placeholder:text-outline/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all shadow-inner"
        />
      </div>
    </div>
  );
}
