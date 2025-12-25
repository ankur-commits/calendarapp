"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:flex h-full`}>
                <Sidebar />
                {isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="absolute top-4 right-[-40px] p-2 bg-white rounded-r-md shadow-md md:hidden text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header Bar */}
                <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0 md:hidden">
                    <button
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-lg text-gray-800 ml-3">FamilyCal</span>
                </div>

                {/* Main Page Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
}
