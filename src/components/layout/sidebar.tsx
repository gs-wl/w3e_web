import React from 'react';
import { X, Network } from 'lucide-react';
import Image from 'next/image';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  active?: boolean;
  badge?: string;
}

interface MenuSection {
  category: string;
  items: MenuItem[];
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  menuItems: MenuSection[];
}

export const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, menuItems }: SidebarProps) => (
  <aside className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:shadow-none lg:border-r lg:border-gray-200 dark:lg:border-gray-800`}>
    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-1 rounded-lg">
          <Image
            src="/logo/logo.png"
            alt="W3-Energy Logo"
            width={72}
            height={56}
            className="h-16 w-18"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">W3-Energy</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Real World Assets</p>
        </div>
      </div>
      <button 
        onClick={() => setSidebarOpen(false)} 
        className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" 
        aria-label="Close sidebar"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
    <nav className="overflow-y-auto h-full pb-20">
      {menuItems.map(section => (
        <div key={section.category} className="p-4">
          <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase mb-3">
            {section.category}
          </h3>
          <div className="space-y-1">
            {section.items.map(item => {
              const Icon = item.icon;
              return (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id)} 
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === item.id 
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.badge === 'NEW' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="p-4 mx-4 mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg dark:bg-gradient-to-r dark:from-orange-900 dark:to-yellow-900 dark:border-orange-700">
        <h4 className="font-semibold text-orange-900 dark:text-yellow-400 mb-2">List Your Assets</h4>
        <p className="text-sm text-orange-700 dark:text-yellow-300 mb-3">Tokenize and list your real-world assets</p>
        <button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-2 px-4 rounded-lg font-medium text-sm hover:from-orange-600 hover:to-yellow-600 transition-all">
          Get Started
        </button>
      </div>
    </nav>
  </aside>
);