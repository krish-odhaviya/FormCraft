"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Header({ breadcrumbs = [], actions }) {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-slate-400" />}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-slate-500 hover:text-indigo-600 transition-colors font-medium"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-slate-900 font-semibold">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
