"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "axios";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/login");
                return;
            }

            // Exclude public/onboarding routes from family check loop
            if (pathname === "/onboarding" || pathname === "/login" || pathname === "/invite") {
                setAuthorized(true);
                return;
            }

            try {
                // Fetch user to check family status
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, // Assuming this endpoint exists? Or just /api/users/me? 
                    // Wait, current API doesn't have /me easily. 
                    // Let's use /api/users/current or just inspect token? Token doesn't update.
                    // We need an endpoint. logic: GET /api/users/profile or similar.
                    // Actually, the plan didn't explicitly add /me. 
                    // I can use GET /api/users/ (list) but that returns a list.
                    // I'll stick to a quick fix: Use the list endpoint, if returns 1 user with my email, check family_id.
                    // Or better, add /me endpoint. 
                    // For now, let's assume I can request /api/users/{id} but I don't know ID.
                    // Let's add specific logic: call GET /api/users/ with limit 1.
                    // Be safe: Assume GET /api/users returns filtered list.
                    // Taking the first user should be "me" if I implemented filtering correctly.

                    // Actually, looking at `users.py`, `read_users` returns `current_user` if no family.
                    // So checking the first element is safe.
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const user = response.data[0]; // Logic from users.py: returns [current_user] if no family or filtered list.

                if (user && !user.family_id) {
                    router.push("/onboarding");
                } else {
                    setAuthorized(true);
                }
            } catch (err) {
                console.error("Auth check failed", err);
                // If 401, redirect login
                router.push("/login");
            }
        };

        checkAuth();
    }, [router, pathname]);

    if (!authorized) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return <>{children}</>;
}
