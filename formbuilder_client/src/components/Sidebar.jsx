"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmationContext";
import {
  FileText, PlusCircle, Shield, LayoutList,
  Users, UserCog, Inbox, LayoutDashboard,
  Menu, ChevronLeft, PanelLeftClose, PanelLeftOpen,
  History, LogOut, Settings, Bell, Mail, Search,
  Lock, Layers, Briefcase, ClipboardList, BarChart3,
  Globe, Database, Plus,
  // New icons added
  LayoutGrid, Home, List, Table2, Kanban,
  FormInput, FilePlus, FileCheck, FileSearch, FolderOpen, FolderKanban,
  BookOpen, BookMarked, ScrollText, Receipt, Notebook, Paperclip,
  UsersRound, UserPlus, UserCheck, UserCircle, Contact, Building2,
  BarChart2, LineChart, PieChart, TrendingUp, TrendingDown, Activity,
  Workflow, GitBranch, Send, Share2, Download, Upload, RefreshCw,
  CheckCircle2, AlertCircle, Clock, CalendarDays,
  MessageSquare, MessageCircle, PhoneCall, Video,
  Key, Fingerprint, Server, Cpu, HardDrive, Terminal, Code2,
  Sliders, Wrench, Package, Plug, ToggleLeft,
  DollarSign, CreditCard, Wallet, ShoppingCart, Tag,
  Map, Compass, UserCheck as UserCk,
} from "lucide-react";

// Map icon strings from backend to Lucide components
// Keys must match exactly the 'id' values in AVAILABLE_ICONS in admin/modules/page.js
const ICON_MAP = {
  // Dashboard & Layout
  "layout":         <LayoutDashboard size={18} />,
  "layout-grid":    <LayoutGrid size={18} />,
  "home":           <Home size={18} />,
  "list":           <List size={18} />,
  "table":          <Table2 size={18} />,
  "kanban":         <Kanban size={18} />,
  // Forms & Documents
  "file-text":      <FileText size={18} />,
  "form-input":     <FormInput size={18} />,
  "file-plus":      <FilePlus size={18} />,
  "file-check":     <FileCheck size={18} />,
  "file-search":    <FileSearch size={18} />,
  "folder":         <FolderOpen size={18} />,
  "folder-kanban":  <FolderKanban size={18} />,
  "book-open":      <BookOpen size={18} />,
  "book-marked":    <BookMarked size={18} />,
  "scroll-text":    <ScrollText size={18} />,
  "receipt":        <Receipt size={18} />,
  "clipboard-list": <ClipboardList size={18} />,
  "notebook":       <Notebook size={18} />,
  // People & Teams
  "users":          <Users size={18} />,
  "users-round":    <UsersRound size={18} />,
  "user-plus":      <UserPlus size={18} />,
  "user-check":     <UserCheck size={18} />,
  "user-circle":    <UserCircle size={18} />,
  "contact":        <Contact size={18} />,
  "building":       <Building2 size={18} />,
  // Analytics & Reports
  "bar-chart":      <BarChart3 size={18} />,
  "bar-chart-2":    <BarChart2 size={18} />,
  "line-chart":     <LineChart size={18} />,
  "pie-chart":      <PieChart size={18} />,
  "trending-up":    <TrendingUp size={18} />,
  "trending-down":  <TrendingDown size={18} />,
  "activity":       <Activity size={18} />,
  // Workflow & Actions
  "workflow":       <Workflow size={18} />,
  "git-branch":     <GitBranch size={18} />,
  "send":           <Send size={18} />,
  "share":          <Share2 size={18} />,
  "download":       <Download size={18} />,
  "upload":         <Upload size={18} />,
  "refresh":        <RefreshCw size={18} />,
  "check-circle":   <CheckCircle2 size={18} />,
  "alert-circle":   <AlertCircle size={18} />,
  "clock":          <Clock size={18} />,
  "calendar":       <CalendarDays size={18} />,
  // Communication
  "mail":           <Mail size={18} />,
  "inbox":          <Inbox size={18} />,
  "bell":           <Bell size={18} />,
  "message":        <MessageSquare size={18} />,
  "chat":           <MessageCircle size={18} />,
  "phone":          <PhoneCall size={18} />,
  "video":          <Video size={18} />,
  // Security & System
  "shield":         <Shield size={18} />,
  "lock":           <Lock size={18} />,
  "key":            <Key size={18} />,
  "fingerprint":    <Fingerprint size={18} />,
  "server":         <Server size={18} />,
  "cpu":            <Cpu size={18} />,
  "hard-drive":     <HardDrive size={18} />,
  "terminal":       <Terminal size={18} />,
  "code":           <Code2 size={18} />,
  // Config & Tools
  "settings":       <Settings size={18} />,
  "sliders":        <Sliders size={18} />,
  "wrench":         <Wrench size={18} />,
  "package":        <Package size={18} />,
  "plug":           <Plug size={18} />,
  "toggle":         <ToggleLeft size={18} />,
  "layers":         <Layers size={18} />,
  // Navigation
  "search":         <Search size={18} />,
  "history":        <History size={18} />,
  "globe":          <Globe size={18} />,
  "map":            <Map size={18} />,
  "compass":        <Compass size={18} />,
  "plus-circle":    <PlusCircle size={18} />,
  // Finance
  "dollar":         <DollarSign size={18} />,
  "credit-card":    <CreditCard size={18} />,
  "wallet":         <Wallet size={18} />,
  "cart":           <ShoppingCart size={18} />,
  "tag":            <Tag size={18} />,
  // General
  "briefcase":      <Briefcase size={18} />,
  "database":       <Database size={18} />,
  "paperclip":      <Paperclip size={18} />,
  "plus":           <Plus size={18} />,
  // Legacy keys for backwards compatibility
  "layout-list":    <LayoutList size={18} />,
  "users-cog":      <Users size={18} />,
  "user-cog":       <UserCog size={18} />,
};


function getIcon(name) {
  return ICON_MAP[name] || <LayoutDashboard size={18} />;
}

function MenuItem({ item, activeItemId, depth = 0, isCollapsed }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  // An item is active if it's the specific active route
  const isActive = item.id === activeItemId;

  // A group is active if any of its descendants is the active item
  const isGroupActive = useMemo(() => {
    if (!hasChildren) return false;
    const checkAnyActive = (children) => {
      return children.some(c => 
        c.id === activeItemId || (c.children && checkAnyActive(c.children))
      );
    };
    return checkAnyActive(item.children);
  }, [item.children, activeItemId, hasChildren]);

  // Auto-open if a child is active
  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
              <MenuItem 
                key={child.id} 
                item={child} 
                activeItemId={activeItemId} 
                depth={depth + 1} 
                isCollapsed={isCollapsed} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.prefix || "#"}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
        isActive
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
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
  const confirm = useConfirm();
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Logout Confirmation",
      message: "Are you sure you want to log out? Any unsaved changes in the builder will be lost.",
      confirmText: "Logout",
      type: "danger"
    });
    
    if (confirmed) {
      logout();
    }
  };

  // Calculate the most specific active menu item (longest matching prefix)
  const activeItemId = useMemo(() => {
    if (!menuItems.length || !pathname) return null;

    const flatten = (items) => {
      let result = [];
      items.forEach(item => {
        if (item.prefix) result.push(item);
        if (item.children) result.push(...flatten(item.children));
      });
      return result;
    };

    const allLinks = flatten(menuItems);
    
    const matches = allLinks
      .filter(item => {
        const prefix = item.prefix;
        if (prefix === "/") return pathname === "/";
        return pathname === prefix || pathname.startsWith(prefix + "/");
      })
      .sort((a, b) => b.prefix.length - a.prefix.length);

    return matches[0]?.id;
  }, [menuItems, pathname]);

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
      className={`h-screen bg-white border-r border-slate-100 flex flex-col shadow-sm transition-all duration-300 ease-in-out sticky top-0 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand */}
      <div className={`h-16 flex items-center px-3 border-b border-slate-100 transition-all ${
        isCollapsed ? "justify-center" : "gap-2.5 px-5"
      }`}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={14} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center min-w-0">
              <span className="text-[14px] font-black text-slate-800 tracking-tight truncate uppercase">FormCraft</span>
              <span className="ml-1.5 text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">Pro</span>
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
          menuItems.map(item => (
            <MenuItem 
              key={item.id} 
              item={item} 
              activeItemId={activeItemId} 
              isCollapsed={isCollapsed} 
            />
          ))
        )}
      </nav>

      {/* Footer */}
      <div className={`border-t border-slate-100 transition-all ${
        isCollapsed ? "p-2" : "p-3"
      }`}>
        <div className={`flex items-center gap-2.5 px-2 py-1.5 ${
          isCollapsed ? "justify-center px-0" : ""
        }`}>
          <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-[10px] font-black shrink-0 uppercase">
            {user?.username?.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-900 truncate">@{user?.username}</p>
            </div>
          )}
          {!isCollapsed && (
            <button 
              onClick={handleLogout}
              className="p-1 px-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group flex items-center gap-2"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button 
            onClick={handleLogout}
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