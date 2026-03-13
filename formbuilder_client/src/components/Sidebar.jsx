"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import {
  FileText, PlusCircle, Shield, LayoutList,
  Users, UserCog, Inbox, LayoutDashboard
} from "lucide-react";

// Map icon strings from backend to Lucide components
const ICON_MAP = {
  "file-text":   <FileText size={18} />,
  "plus-circle": <PlusCircle size={18} />,
  "shield":      <Shield size={18} />,
  "layout-list": <LayoutList size={18} />,
  "users-cog":   <Users size={18} />,
  "user-cog":    <UserCog size={18} />,
  "inbox":       <Inbox size={18} />,
  "layout":      <LayoutDashboard size={18} />,
};

function getIcon(name) {
  return ICON_MAP[name] || <LayoutDashboard size={18} />;
}

function MenuItem({ item, depth = 0 }) {
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
          }`}
        >
          <span className={open || isGroupActive ? "text-indigo-600" : "text-slate-400"}>
            {getIcon(item.iconCss)}
          </span>
          <span className="flex-1 text-left">{item.moduleName}</span>
          <span className="text-slate-400">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-100 pl-3">
            {item.children.map(child => (
              <MenuItem key={child.id} item={child} depth={depth + 1} />
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
      }`}
    >
      <span className={isActive ? "text-white" : "text-slate-400"}>
        {getIcon(item.iconCss)}
      </span>
      {item.moduleName}
    </Link>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.getUserMenu()
      .then(res => setMenuItems(res.data || []))
      .catch(() => setMenuItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading) return null;

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-100 flex flex-col shadow-sm">
      {/* Brand */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
          <FileText size={16} className="text-white" />
        </div>
        <div>
          <span className="text-base font-black text-slate-900 tracking-tight">FORMCRAFT</span>
          <span className="ml-1.5 text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest">PRO</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-6 text-center">No menu items</p>
        ) : (
          menuItems.map(item => <MenuItem key={item.id} item={item} />)
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-black">
            {user?.username?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.username}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
