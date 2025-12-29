"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, CheckSquare, Calendar, User, Loader2, Check } from "lucide-react";
import { format } from "date-fns";

export default function ToDosPage() {
    const [todos, setTodos] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'my'>('all');

    // Form State
    const [newTitle, setNewTitle] = useState("");
    const [newDueDate, setNewDueDate] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [adding, setAdding] = useState(false);

    // Mock current user ID (should come from AuthContext)
    const currentUserId = 1;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [todosRes, usersRes] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/todos`),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users`)
            ]);
            setTodos(todosRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setAdding(true);
        try {
            const payload: any = {
                title: newTitle,
                status: "pending"
            };
            if (newDueDate) payload.due_date = new Date(newDueDate).toISOString();
            if (assignedTo) payload.assigned_to_user_id = parseInt(assignedTo);

            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/todos`, payload);
            setTodos([...todos, response.data]);

            // Reset form
            setNewTitle("");
            setNewDueDate("");
            setAssignedTo("");
        } catch (error) {
            console.error("Failed to add todo", error);
        } finally {
            setAdding(false);
        }
    };

    const handleToggle = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === "completed" ? "pending" : "completed";
        // Optimistic update
        setTodos(todos.map(t => t.id === id ? { ...t, status: newStatus } : t));

        try {
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/todos/${id}`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert on fail
            fetchData();
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/todos/${id}`);
            setTodos(todos.filter(t => t.id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const filteredTodos = todos.filter(t => {
        if (filter === 'my') {
            return t.assigned_to_user_id === currentUserId;
        }
        return true;
    });

    const getUserName = (id: number) => users.find(u => u.id === id)?.name || "Unknown";

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="flex-1 flex flex-col h-full bg-gray-50">
                    <header className="bg-white border-b px-8 py-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <CheckSquare className="w-6 h-6 text-purple-600" />
                                <h1 className="text-2xl font-bold text-gray-800">To Do & Reminders</h1>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                All Tasks
                            </button>
                            <button
                                onClick={() => setFilter('my')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'my' ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                My Tasks
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="max-w-3xl mx-auto space-y-6">

                            {/* Add Form */}
                            <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm border space-y-4 md:space-y-0 md:flex md:gap-3 md:items-start">
                                <div className="flex-1 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="What needs to be done?"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                    />
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="date"
                                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-purple-500"
                                                value={newDueDate}
                                                onChange={(e) => setNewDueDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white outline-none focus:border-purple-500"
                                                value={assignedTo}
                                                onChange={(e) => setAssignedTo(e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={adding || !newTitle.trim()}
                                    className="w-full md:w-auto bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium h-[82px]"
                                >
                                    {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Add Task
                                </button>
                            </form>

                            {/* List */}
                            {loading ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : filteredTodos.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                                    <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No tasks found.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    {filteredTodos.map(todo => (
                                        <div key={todo.id} className={`flex items-start p-4 border-b last:border-0 hover:bg-gray-50 transition-colors group ${todo.status === 'completed' ? 'bg-gray-50' : ''}`}>
                                            <button
                                                onClick={() => handleToggle(todo.id, todo.status)}
                                                className={`mt-1 mr-4 w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${todo.status === 'completed'
                                                        ? "bg-purple-500 border-purple-500 text-white"
                                                        : "border-gray-300 hover:border-purple-500"
                                                    }`}
                                            >
                                                {todo.status === 'completed' && <Check className="w-3 h-3" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium text-gray-800 ${todo.status === 'completed' ? 'opacity-50 line-through' : ''}`}>
                                                    {todo.title}
                                                </p>

                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {todo.due_date && (
                                                        <span className="inline-flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            {format(new Date(todo.due_date), "MMM d")}
                                                        </span>
                                                    )}
                                                    {todo.assigned_to_user_id && (
                                                        <span className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                            <User className="w-3 h-3 mr-1" />
                                                            {getUserName(todo.assigned_to_user_id)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(todo.id)}
                                                className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
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
