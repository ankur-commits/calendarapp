"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Calendar as CalendarIcon, BarChart3 } from "lucide-react";
import UserSwitcher from "./UserSwitcher";

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-8">
                    <CalendarIcon className="w-8 h-8 text-blue-600" />
                    <span className="text-xl font-bold text-gray-900">FamilyCal</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive("/")
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>

                    <Link
                        href="/analytics"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive("/analytics")
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                    >
                        <BarChart3 className="w-5 h-5" />
                        Analytics
                    </Link>

                    <Link
                        href="/settings"
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive("/settings")
                            ? "bg-blue-50 text-blue-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        Settings
                    </Link>
                </nav>
            </div>

            <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 mb-3 px-1 uppercase tracking-wider">
                    Current User
                </p>
                <div className="flex justify-center">
                    <UserSwitcher />
                </div>
            </div>
        </aside>
    );
}
