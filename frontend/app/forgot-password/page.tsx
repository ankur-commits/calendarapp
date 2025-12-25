"use client";

import { useState } from "react";
import axios from "axios";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            setSuccess(true);
        } catch (error) {
            console.error(error);
            // Always show success to prevent enumeration
            setSuccess(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
                    <p className="text-gray-600 mt-2">Enter your email to receive a reset link.</p>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="bg-green-50 text-green-700 p-4 rounded mb-6">
                            Check your email (and server console) for the reset link!
                        </div>
                        <Link href="/login" className="text-blue-600 hover:underline flex items-center justify-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    className="w-full border rounded-lg pl-10 p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>

                        <div className="text-center">
                            <Link href="/login" className="text-sm text-gray-500 hover:underline">
                                Cancel
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
