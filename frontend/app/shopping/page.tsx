"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, Check, ShoppingCart, Loader2 } from "lucide-react";

export default function ShoppingPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState("");
    const [newItemCategory, setNewItemCategory] = useState("General");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/shopping`);
            setItems(response.data);
        } catch (error) {
            console.error("Failed to fetch shopping list", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        setAdding(true);
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/shopping`, {
                name: newItemName,
                category: newItemCategory
            });
            setItems([...items, response.data]);
            setNewItemName("");
            setNewItemCategory("General");
        } catch (error) {
            console.error("Failed to add item", error);
        } finally {
            setAdding(false);
        }
    };

    const handleToggle = async (id: number) => {
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/shopping/${id}/toggle`);
            setItems(items.map(item => item.id === id ? { ...item, is_bought: response.data.is_bought } : item));
        } catch (error) {
            console.error("Failed to toggle item", error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/shopping/${id}`);
            setItems(items.filter(item => item.id !== id));
        } catch (error) {
            console.error("Failed to delete item", error);
        }
    };

    const categories = ["General", "Groceries", "Household", "Pharmacy", "Kids"];

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="flex-1 flex flex-col h-full bg-gray-50">
                    <header className="bg-white border-b px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="w-6 h-6 text-green-600" />
                            <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
                        </div>
                        {/* Admin 'Clear' button could go here */}
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="max-w-2xl mx-auto space-y-6">

                            {/* Add Form */}
                            <form onSubmit={handleAddItem} className="bg-white p-4 rounded-xl shadow-sm border flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Add item..."
                                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                                <select
                                    className="px-4 py-2 border rounded-lg bg-white outline-none focus:border-green-500"
                                    value={newItemCategory}
                                    onChange={(e) => setNewItemCategory(e.target.value)}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button
                                    type="submit"
                                    disabled={adding || !newItemName.trim()}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium"
                                >
                                    {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Add
                                </button>
                            </form>

                            {/* List */}
                            {loading ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Your list is empty.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    {items.map(item => (
                                        <div key={item.id} className={`flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 transition-colors ${item.is_bought ? 'bg-gray-50' : ''}`}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <button
                                                    onClick={() => handleToggle(item.id)}
                                                    className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${item.is_bought
                                                            ? "bg-green-500 border-green-500 text-white"
                                                            : "border-gray-300 hover:border-green-500"
                                                        }`}
                                                >
                                                    {item.is_bought && <Check className="w-4 h-4" />}
                                                </button>
                                                <div className={`${item.is_bought ? 'opacity-50 line-through' : ''}`}>
                                                    <p className="font-medium text-gray-800">{item.name}</p>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </main>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
