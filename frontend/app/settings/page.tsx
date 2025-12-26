"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Save, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/DashboardLayout";

interface User {
    id: number;
    name: string;
    email: string;
    role?: string;
    phone_number?: string;
    preferences: {
        address?: string; // New
        schedule_travel_time?: boolean; // New
        interests?: string[];
        wishlist?: string;
        context?: string;
        budget?: { min: number; max: number; currency: string };
        dietary?: string[];
        travel?: { max_distance_miles: number; preferred_transport: string };
    };
}

export default function SettingsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form state
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users`);
            setUsers(response.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching users:", err);
            setLoading(false);
        }
    };

    const handleUserClick = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            phone_number: user.phone_number || "",
            address: user.preferences?.address || "", // New
            scheduleTravelTime: user.preferences?.schedule_travel_time || false, // New
            interests: user.preferences?.interests?.join(", ") || "",
            wishlist: user.preferences?.wishlist || "",
            context: user.preferences?.context || "",
            budgetMin: user.preferences?.budget?.min || 0,
            budgetMax: user.preferences?.budget?.max || 100,
            dietary: user.preferences?.dietary?.join(", ") || "",
            travelDist: user.preferences?.travel?.max_distance_miles || 50,
            travelTransport: user.preferences?.travel?.preferred_transport || "car",
            role: user.role || "member",
            password: ""
        });
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setSelectedUser(null);
        setFormData({
            name: "",
            email: "",
            phone_number: "",
            address: "", // New
            scheduleTravelTime: false, // New
            interests: "",
            wishlist: "",
            context: "",
            budgetMin: 0,
            budgetMax: 100,
            dietary: "",
            travelDist: 50,
            travelTransport: "car",
            password: "",
            role: "member"
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        const preferences = {
            address: formData.address, // New
            schedule_travel_time: formData.scheduleTravelTime, // New
            interests: formData.interests.split(",").map((s: string) => s.trim()).filter((s: string) => s),
            wishlist: formData.wishlist,
            context: formData.context,
            budget: {
                min: Number(formData.budgetMin),
                max: Number(formData.budgetMax),
                currency: "USD"
            },
            dietary: formData.dietary.split(",").map((s: string) => s.trim()).filter((s: string) => s),
            travel: {
                max_distance_miles: Number(formData.travelDist),
                preferred_transport: formData.travelTransport
            }
        };

        const payload: any = {
            name: formData.name,
            email: formData.email,
            phone_number: formData.phone_number,
            role: formData.role,
            preferences: preferences
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        try {
            if (selectedUser) {
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${selectedUser.id}`, payload);
            } else {
                await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, payload);
            }
            fetchUsers();
            setIsEditing(false);
            setSelectedUser(null);
        } catch (err) {
            console.error("Error saving user:", err);
            alert("Failed to save user");
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-auto p-8">
                        <div className="max-w-6xl mx-auto">
                            <header className="mb-8 flex justify-between items-center">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Settings & Preferences</h1>
                                    <p className="text-gray-600 mt-2">Manage family members and their preferences.</p>
                                </div>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Sidebar: User List */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold">Family Members</h2>
                                        <button
                                            onClick={handleCreateNew}
                                            className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                                    ) : (
                                        <div className="space-y-2">
                                            {users.map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => handleUserClick(user)}
                                                    className={`p-3 rounded cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'}`}
                                                >
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            ))}
                                            {users.length === 0 && <p className="text-gray-500 text-sm">No members yet.</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Main Content: Edit Form */}
                                <div className="md:col-span-2">
                                    {isEditing ? (
                                        <div className="bg-white rounded-lg shadow p-6">
                                            <h2 className="text-xl font-semibold mb-6">
                                                {selectedUser ? `Edit Profile: ${selectedUser.name}` : "New Family Member"}
                                            </h2>

                                            <div className="space-y-6">
                                                {/* Basic Info */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded p-2"
                                                            value={formData.name}
                                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                        <input
                                                            type="email"
                                                            className="w-full border rounded p-2"
                                                            value={formData.email}
                                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        placeholder="+1 (555) 000-0000"
                                                        className="w-full border rounded p-2"
                                                        value={formData.phone_number}
                                                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            {selectedUser ? "New Password (leave blank to keep)" : "Password"}
                                                        </label>
                                                        <input
                                                            type="password"
                                                            className="w-full border rounded p-2"
                                                            placeholder={selectedUser ? "••••••••" : "Required"}
                                                            value={formData.password || ""}
                                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                                        <select
                                                            className="w-full border rounded p-2"
                                                            value={formData.role || "member"}
                                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                        >
                                                            <option value="member">Member</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <hr />

                                                {/* Preferences */}
                                                <div>
                                                    <h3 className="font-medium text-gray-900 mb-4">Preferences & Context</h3>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Interests (comma separated)</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Hiking, Jazz, Sci-Fi"
                                                                className="w-full border rounded p-2"
                                                                value={formData.interests}
                                                                onChange={e => setFormData({ ...formData, interests: e.target.value })}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Wish List (Specific events/things)</label>
                                                            <textarea
                                                                rows={2}
                                                                placeholder="Hamilton tickets, Visit to Yosemite..."
                                                                className="w-full border rounded p-2"
                                                                value={formData.wishlist}
                                                                onChange={e => setFormData({ ...formData, wishlist: e.target.value })}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Context / Bio</label>
                                                            <textarea
                                                                rows={3}
                                                                placeholder="Likes outdoor activities, dislikes spicy food, free on weekends..."
                                                                className="w-full border rounded p-2"
                                                                value={formData.context}
                                                                onChange={e => setFormData({ ...formData, context: e.target.value })}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                                                            <input
                                                                type="text"
                                                                placeholder="123 Main St, Seattle, WA"
                                                                className="w-full border rounded p-2"
                                                                value={formData.address}
                                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Vegetarian, Nut Allergy"
                                                                    className="w-full border rounded p-2"
                                                                    value={formData.dietary}
                                                                    onChange={e => setFormData({ ...formData, dietary: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Transport</label>
                                                                <select
                                                                    className="w-full border rounded p-2"
                                                                    value={formData.travelTransport}
                                                                    onChange={e => setFormData({ ...formData, travelTransport: e.target.value })}
                                                                >
                                                                    <option value="car">Car</option>
                                                                    <option value="public_transit">Public Transit</option>
                                                                    <option value="walking">Walking</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-2">
                                                            <input
                                                                type="checkbox"
                                                                id="scheduleTravelTime"
                                                                checked={formData.scheduleTravelTime || false}
                                                                onChange={e => setFormData({ ...formData, scheduleTravelTime: e.target.checked })}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <label htmlFor="scheduleTravelTime" className="text-sm text-gray-700">
                                                                Automatically schedule travel time for events
                                                            </label>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range (USD)</label>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        className="w-full border rounded p-2"
                                                                        value={formData.budgetMin}
                                                                        onChange={e => setFormData({ ...formData, budgetMin: e.target.value })}
                                                                    />
                                                                    <span>to</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-full border rounded p-2"
                                                                        value={formData.budgetMax}
                                                                        onChange={e => setFormData({ ...formData, budgetMax: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Travel Distance (miles)</label>
                                                                <input
                                                                    type="number"
                                                                    className="w-full border rounded p-2"
                                                                    value={formData.travelDist}
                                                                    onChange={e => setFormData({ ...formData, travelDist: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-4 pt-4">
                                                    <button
                                                        onClick={() => setIsEditing(false)}
                                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSave}
                                                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        Save Profile
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                            <p className="text-lg">Select a family member to edit their preferences, or add a new one.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
