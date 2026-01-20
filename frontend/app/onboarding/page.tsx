"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Users, UserPlus, Loader2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"select" | "create" | "join">("select");
    const [loading, setLoading] = useState(false);

    // Create Family State
    const [familyName, setFamilyName] = useState("");

    // Join Family State
    const [adminEmail, setAdminEmail] = useState("");

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
        if (typeof window !== "undefined") router.push("/login");
        return null;
    }

    const handleCreateFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/families/`,
                { name: familyName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Success, redirect to dashboard
            router.push("/");
        } catch (err) {
            console.error(err);
            alert("Failed to create family.");
            setLoading(false);
        }
    };

    const handleJoinRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/families/join-request`,
                { admin_email: adminEmail },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Request sent to family admin! They need to troubleshoot/approve (Mock).");
            setLoading(false);
            // In real app, show "Pending" state.
        } catch (err) {
            console.error(err);
            alert("Failed to send join request. Check the email.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to FamilyCal!</h1>
                        <p className="text-gray-600">Let's get you set up with a family group.</p>
                    </div>

                    {mode === "select" && (
                        <div className="space-y-4">
                            <button
                                onClick={() => setMode("create")}
                                className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Create a New Family</h3>
                                        <p className="text-sm text-gray-500">I'm starting a new calendar for my household.</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setMode("join")}
                                className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 rounded-full text-green-600 group-hover:scale-110 transition-transform">
                                        <UserPlus className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Join an Existing Family</h3>
                                        <p className="text-sm text-gray-500">Someone already invited me or I need to join one.</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {mode === "create" && (
                        <form onSubmit={handleCreateFamily} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Family Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="The Smiths"
                                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={familyName}
                                    onChange={e => setFamilyName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setMode("select")}
                                    className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <>Create Family <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === "join" && (
                        <form onSubmit={handleJoinRequest} className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800 mb-2">
                                Tip: If you received an invite link via email, click that instead!
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Family Admin's Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="admin@example.com"
                                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setMode("select")}
                                    className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Send Request"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
