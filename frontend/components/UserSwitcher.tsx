"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Users, LogIn } from "lucide-react";

export default function UserSwitcher() {
    const [users, setUsers] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
        // Decode token to get current user (naive check)
        const token = localStorage.getItem("token");
        if (token) {
            try {
                // Quick parse JWT
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserEmail(payload.sub);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get("http://localhost:8000/api/users");
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users for switcher:", error);
        }
    };

    const handleSwitch = async (email: string) => {
        try {
            const response = await axios.post("http://localhost:8000/api/auth/dev-login", { email });
            localStorage.setItem("token", response.data.access_token);
            window.location.reload(); // Hard reload to reset state
        } catch (error) {
            console.error("Dev login failed:", error);
            alert("Failed to switch user");
        }
    };

    // If users are not loaded yet, show a loading state or default button
    // if (users.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors border border-purple-200"
                title="Dev Tool: Switch User"
            >
                <Users className="w-3 h-3" />
                {currentUserEmail ? currentUserEmail.split('@')[0] : "Switch User"}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">
                        Switch Profile (Dev)
                    </div>
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => handleSwitch(u.email)}
                            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${u.email === currentUserEmail ? "bg-blue-50 text-blue-600" : "text-gray-700"
                                }`}
                        >
                            <UserAvatar name={u.name} />
                            <span className="truncate">{u.name}</span>
                            {u.email === currentUserEmail && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                        </button>
                    ))}
                    <div className="border-t mt-1 pt-1">
                        <button
                            onClick={() => {
                                localStorage.removeItem("token");
                                window.location.href = "/login";
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <LogIn className="w-3 h-3" />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserAvatar({ name }: { name: string }) {
    return (
        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
            {name.charAt(0).toUpperCase()}
        </div>
    );
}
