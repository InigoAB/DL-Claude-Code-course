'use client';

import { useState } from 'react';

interface MenuItem {
  title: string;
  icon: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
}

const menuItems: MenuItem[] = [
  { title: 'Key Indicators', icon: '📊', isActive: true },
  { title: 'Inflation', icon: '📈' },
  { title: 'Employment', icon: '👥' },
  { title: 'Interest Rates', icon: '💰' },
  { title: 'Economic Growth', icon: '📈' },
  { title: 'Exchange Rates', icon: '🌐' },
  { title: 'Housing', icon: '🏠' },
  { title: 'Consumer Spending', icon: '🛒' },
];

type CategoryType = 'Key Indicators' | 'Inflation' | 'Employment' | 'Interest Rates' | 'Economic Growth' | 'Exchange Rates' | 'Housing' | 'Consumer Spending';

interface SidebarProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

export default function Sidebar({ activeCategory, onCategoryChange }: SidebarProps) {

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col shadow-2xl border-r border-slate-700/50">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-inter">
              FRED
            </h2>
            <p className="text-xs text-slate-400 font-inter">
              Economic Data
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
            Indicators
          </p>
        </div>
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={item.title}>
              <button
                onClick={() => onCategoryChange(item.title as CategoryType)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left font-inter transition-all duration-200 group ${
                  item.title === activeCategory
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    item.title === activeCategory 
                      ? 'bg-white/20' 
                      : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                  }`}>
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <span className="font-medium text-sm">{item.title}</span>
                </div>
              </button>
              
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-xs">🏛️</span>
            </div>
            <p className="text-xs font-semibold text-slate-300">Federal Reserve</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time economic data and analysis
          </p>
        </div>
      </div>
    </div>
  );
}