"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { Search, Sparkles, RotateCcw, Loader2, ArrowRight } from "lucide-react";
import ActionCard from "./ActionCard";

interface EventAssistantProps {
    onAddEvent: (data: any) => void;
}

interface AssistantItem {
    type: 'event' | 'shopping' | 'todo';
    data: any;
}

export default function EventAssistant({ onAddEvent }: EventAssistantProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<AssistantItem[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleReset = () => {
        setQuery("");
        setItems([]);
        setHasSearched(false);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        setItems([]);

        // Simple heuristic to distinguish "Discovery/Search" from "Action/Create"
        const searchKeywords = /^(what|find|search|suggest|show|are there|is there|list|recommend|looking for)\b/i;
        const isSearch = searchKeywords.test(query);

        try {
            const endpoint = isSearch ? '/api/assistant/search' : '/api/assistant/interact';

            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
                query: query,
                user_id: 1 // Default user for now
            });

            const data = response.data;
            const newItems: AssistantItem[] = [];

            if (isSearch) {
                // Handle Search Response
                if (data.suggestions) {
                    data.suggestions.forEach((suggestion: any) => {
                        newItems.push({ type: 'event', data: suggestion });
                    });
                }
            } else {
                // Handle Interact/Action Response
                if (data.events) {
                    data.events.forEach((evt: any) => newItems.push({ type: 'event', data: evt }));
                }
                if (data.shopping_list) {
                    data.shopping_list.forEach((item: any) => newItems.push({ type: 'shopping', data: item }));
                }
                if (data.todos) {
                    data.todos.forEach((todo: any) => newItems.push({ type: 'todo', data: todo }));
                }
            }

            setItems(newItems);

        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setQuery(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleAddEvent = async (data: any) => {
        // Prepare data for the existing modal
        // Note: The modal expects certain fields.
        const startDate = data.start_time ? data.start_time.split("T")[0] : new Date().toISOString().split("T")[0];
        const startTime = data.start_time && data.start_time.includes("T") ? data.start_time.split("T")[1].slice(0, 5) : "12:00";

        // For events, we currently just open the modal via the parent prop.
        // We'll wrap it in a promise that resolves immediately so the button stops spinning.
        // In a future version, this could be a direct API call if fully confident.
        onAddEvent({
            title: data.title,
            description: data.description || "",
            start_date: startDate,
            start_time: startTime,
            end_date: startDate, // Default 1 hour
            end_time: "13:00",
            location: data.location || "",
            category: data.category || "General"
        });
        return Promise.resolve();
    };

    const handleAddShopping = async (data: any) => {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/shopping`, {
            name: data.name,
            category: data.category || "General"
        });
    };

    const handleAddToDo = async (data: any) => {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/todos`, {
            title: data.title,
            due_date: data.due_date,
            status: "pending"
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-800">AI Assistant</h3>
                </div>
                {hasSearched && (
                    <button
                        onClick={handleReset}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                        title="Start Over"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {loading && (
                    <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <p className="text-sm">Thinking...</p>
                    </div>
                )}

                {!loading && hasSearched && items.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">No suggestions found. Try a different query.</p>
                )}

                {!loading && !hasSearched && (
                    <div className="text-center py-8 text-gray-400">
                        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Suggest events, or say "We need milk and remind me to call Dad"</p>
                    </div>
                )}

                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                    {items.map((item, idx) => (
                        <ActionCard
                            key={idx}
                            type={item.type}
                            data={item.data}
                            onAdd={
                                item.type === 'event' ? handleAddEvent :
                                    item.type === 'shopping' ? handleAddShopping :
                                        handleAddToDo
                            }
                        />
                    ))}
                </div>
            </div>

            <div className="p-4 border-t bg-white flex-shrink-0">
                <div className="flex items-end gap-2 border rounded-xl p-2 bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
                    <Search className="w-5 h-5 text-gray-400 mb-2 ml-1" />
                    <textarea
                        ref={textareaRef}
                        placeholder="Type something..."
                        className="flex-1 max-h-32 min-h-[24px] py-1.5 px-2 text-sm focus:outline-none resize-none overflow-hidden bg-transparent"
                        value={query}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading || !query.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
