"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, LayoutGrid, Home, List, Table2, Kanban, FileText, 
  FormInput, FilePlus, FileCheck, FileSearch, FolderOpen, FolderKanban, 
  BookOpen, BookMarked, ScrollText, Receipt, ClipboardList, Notebook, 
  Users, UsersRound, UserPlus, UserCheck, UserCircle, Contact, Building2, 
  BarChart3, BarChart2, LineChart, PieChart, TrendingUp, TrendingDown, 
  Activity, Workflow, GitBranch, Send, Share2, Download, Upload, 
  RefreshCw, CheckCircle2, AlertCircle, Clock, CalendarDays, Mail, 
  Inbox, Bell, MessageSquare, MessageCircle, PhoneCall, Video, Shield, 
  Lock, Key, Fingerprint, Server, Cpu, HardDrive, Terminal, Code2, 
  Settings, Sliders, Wrench, Package, Plug, ToggleLeft, Layers, 
  Search, History, Globe, Map, Compass, PlusCircle, DollarSign, 
  CreditCard, Wallet, ShoppingCart, Tag, Briefcase, Database, 
  Paperclip, Plus, ChevronRight, Layers as AppLogo
} from "lucide-react";
import { api } from "@/lib/api/formService";

const ICON_MAP = {
  "layout": LayoutDashboard,
  "layout-grid": LayoutGrid,
  "home": Home,
  "list": List,
  "table": Table2,
  "kanban": Kanban,
  "file-text": FileText,
  "form-input": FormInput,
  "file-plus": FilePlus,
  "file-check": FileCheck,
  "file-search": FileSearch,
  "folder": FolderOpen,
  "folder-kanban": FolderKanban,
  "book-open": BookOpen,
  "book-marked": BookMarked,
  "scroll-text": ScrollText,
  "receipt": Receipt,
  "clipboard-list": ClipboardList,
  "notebook": Notebook,
  "users": Users,
  "users-round": UsersRound,
  "user-plus": UserPlus,
  "user-check": UserCheck,
  "user-circle": UserCircle,
  "contact": Contact,
  "building": Building2,
  "bar-chart": BarChart3,
  "bar-chart-2": BarChart2,
  "line-chart": LineChart,
  "pie-chart": PieChart,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "activity": Activity,
  "workflow": Workflow,
  "git-branch": GitBranch,
  "send": Send,
  "share": Share2,
  "download": Download,
  "upload": Upload,
  "refresh": RefreshCw,
  "check-circle": CheckCircle2,
  "alert-circle": AlertCircle,
  "clock": Clock,
  "calendar": CalendarDays,
  "mail": Mail,
  "inbox": Inbox,
  "bell": Bell,
  "message": MessageSquare,
  "chat": MessageCircle,
  "phone": PhoneCall,
  "video": Video,
  "shield": Shield,
  "lock": Lock,
  "key": Key,
  "fingerprint": Fingerprint,
  "server": Server,
  "cpu": Cpu,
  "hard-drive": HardDrive,
  "terminal": Terminal,
  "code": Code2,
  "settings": Settings,
  "sliders": Sliders,
  "wrench": Wrench,
  "package": Package,
  "plug": Plug,
  "toggle": ToggleLeft,
  "layers": Layers,
  "search": Search,
  "history": History,
  "globe": Globe,
  "map": Map,
  "compass": Compass,
  "plus-circle": PlusCircle,
  "dollar": DollarSign,
  "credit-card": CreditCard,
  "wallet": Wallet,
  "cart": ShoppingCart,
  "tag": Tag,
  "briefcase": Briefcase,
  "database": Database,
  "paperclip": Paperclip,
  "plus": Plus,
};

function NavLink({ item, active }) {
  const Icon = ICON_MAP[item.iconCss] || FileText;
  return (
    <Link
      href={item.prefix || "#"}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
      `}
    >
      <Icon size={18} className={active ? "text-indigo-600" : ""} />
      {item.moduleName}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await api.getUserMenu();
        setMenu(response.data || []);
      } catch (err) {
        console.error("Failed to load menu", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <AppLogo size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none">FormBuilder</p>
          <p className="text-xs text-slate-500 leading-none mt-0.5">Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          menu.map((item) => (
            <div key={item.id} className="space-y-0.5">
              {item.isParent ? (
                <div className="mt-4 first:mt-0 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.moduleName}</p>
                  <div className="mt-2 space-y-0.5">
                    {item.children?.map((child) => (
                      <NavLink key={child.id} item={child} active={pathname === child.prefix} />
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink item={item} active={pathname === item.prefix} />
              )}
            </div>
          ))
        )}
      </nav>

      {/* Create Form CTA fallback - standard link */}
      <div className="p-3 border-t border-slate-100">
        <Link
          href="/forms/new"
          className="flex items-center gap-2 w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Form
          <ChevronRight size={14} className="ml-auto opacity-70" />
        </Link>
      </div>
    </aside>
  );
}
