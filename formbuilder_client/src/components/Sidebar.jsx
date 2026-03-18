"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import {
  FileText, PlusCircle, Shield, LayoutList,
  Users, UserCog, Inbox, LayoutDashboard,
  Menu, ChevronLeft, PanelLeftClose, PanelLeftOpen,
  History, LogOut, Settings, Bell, Mail, Search,
  Lock, Layers, Briefcase, ClipboardList, BarChart3,
  Globe, Database, Plus
} from "lucide-react";

// Map icon strings from backend to Lucide components
const ICON_MAP = {
  "file-text":      <FileText size={18} />,
  "plus-circle":    <PlusCircle size={18} />,
  "shield":         <Shield size={18} />,
  "layout-list":    <LayoutList size={18} />,
  "users-cog":      <Users size={18} />,
  "user-cog":       <UserCog size={18} />,
  "inbox":          <Inbox size={18} />,
  "layout":         <LayoutDashboard size={18} />,
  "history":        <History size={18} />,
  "settings":       <Settings size={18} />,
  "bell":           <Bell size={18} />,
  "mail":           <Mail size={18} />,
  "search":         <Search size={18} />,
  "lock":           <Lock size={18} />,
  "layers":         <Layers size={18} />,
  "briefcase":      <Briefcase size={18} />,
  "clipboard-list": <ClipboardList size={18} />,
  "bar-chart":      <BarChart3 size={18} />,
  "globe":          <Globe size={18} />,
  "database":       <Database size={18} />,
  "plus":           <Plus size={18} />,
};

function getIcon(name) {
  return ICON_MAP[name] || <LayoutDashboard size={18} />;
}

function MenuItem({ item, depth = 0, isCollapsed }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.prefix && pathname === item.prefix;
  const isGroupActive = hasChildren && item.children.some(c => c.prefix && pathname.startsWith(c.prefix));

  // Auto-open if a child is active
  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            open || isGroupActive
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-50"
          } ${isCollapsed ? "justify-center px-0" : ""}`}
          title={isCollapsed ? item.moduleName : ""}
        >
          <span className={open || isGroupActive ? "text-indigo-600" : "text-slate-400"}>
            {getIcon(item.iconCss)}
          </span>
          {!isCollapsed && <span className="flex-1 text-left">{item.moduleName}</span>}
          {!isCollapsed && (
            <span className="text-slate-400">
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </button>
        {open && !isCollapsed && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-100 pl-3">
            {item.children.map(child => (
              <MenuItem key={child.id} item={child} depth={depth + 1} isCollapsed={isCollapsed} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.prefix || "#"}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      } ${isCollapsed ? "justify-center px-0" : ""}`}
      title={isCollapsed ? item.moduleName : ""}
    >
      <span className={isActive ? "text-white" : "text-slate-400"}>
        {getIcon(item.iconCss)}
      </span>
      {!isCollapsed && item.moduleName}
    </Link>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.getUserMenu()
      .then(res => setMenuItems(res.data || []))
      .catch(() => setMenuItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading) return null;

  return (
    <aside 
      className={`min-h-screen bg-white border-r border-slate-100 flex flex-col shadow-sm transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand */}
      <div className={`h-20 flex items-center px-4 border-b border-slate-100 transition-all ${
        isCollapsed ? "justify-center" : "gap-3 px-6"
      }`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={16} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center min-w-0">
              <span className="text-base font-black text-slate-900 tracking-tight truncate">FORMCRAFT</span>
              <span className="ml-1.5 text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">PRO</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className={`flex-1 space-y-1 overflow-y-auto transition-all ${
        isCollapsed ? "p-3" : "p-4"
      }`}>
        {menuItems.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-6 text-center">{!isCollapsed && "No menu items"}</p>
        ) : (
          menuItems.map(item => <MenuItem key={item.id} item={item} isCollapsed={isCollapsed} />)
        )}
      </nav>

      {/* Footer */}
      <div className={`border-t border-slate-100 transition-all ${
        isCollapsed ? "p-2" : "p-4"
      }`}>
        <div className={`flex items-center gap-3 px-3 py-2 ${
          isCollapsed ? "justify-center px-0" : ""
        }`}>
          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-black shrink-0">
            {user?.username?.charAt(0)?.toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.username}</p>
            </div>
          )}
          {!isCollapsed && (
            <button 
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button 
            onClick={logout}
            className="w-full flex justify-center py-2 mt-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
