"use client";

import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Analytics from "@/components/Analytics";

export default function AnalyticsPage() {
    return (
        <AuthGuard>
            <div className="flex h-screen bg-gray-50 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-auto p-8">
                        <div className="max-w-6xl mx-auto">
                            <header className="mb-8">
                                <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
                                <p className="text-gray-600 mt-2">Visualize family time and trends.</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Can add more widgets here later */}
                                <Analytics />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
