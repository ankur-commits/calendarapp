"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { UserCheck, Loader2, ArrowRight } from "lucide-react";

function InviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/setup-invite?token=${token}`,
                {
                    name: name,
                    email: "placeholder@example.com", // Schema requires email but backend ignores it for updates
                    password: password,
                    role: "member" // Default, backend ignores or sets from DB
                }
            );

            // Login success
            const { access_token } = response.data;
            if (access_token) {
                localStorage.setItem("token", access_token);
                router.push("/");
            } else {
                alert("Setup successful. Please login.");
                router.push("/login");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to accept invite. Token might be invalid or expired.");
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center p-8">
                <p className="text-red-600">Invalid invite link.</p>
            </div>
        );
    }

    return (
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-8">
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
                    <p className="text-gray-600">Set up your profile to join the family calendar.</p>
                </div>

                <form onSubmit={handleAccept} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            type="text"
                            required
                            placeholder="John Doe"
                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Choose Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Join Family <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function InvitePage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <InviteContent />
            </Suspense>
        </div>
    );
}
