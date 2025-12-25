"use client";

import { useState, Suspense } from "react";
import axios from "axios";
import { Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <div className="text-center text-red-600">
                Invalid or missing reset token.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    new_password: password
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to reset password');
            }

            alert("Password updated! Please login.");
            router.push("/login");
        } catch (error) {
            console.error(error);
            alert("Failed to reset password. Token may be invalid or expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="password"
                        required
                        className="w-full border rounded-lg pl-10 p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? "Updating..." : "Reset Password"}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
                </div>
                <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
