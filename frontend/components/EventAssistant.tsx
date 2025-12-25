"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { Search, MapPin, Clock, Users, DollarSign, Sparkles, ArrowRight, Loader2, Car, RotateCcw } from "lucide-react";
// ... imports

// ... inside component

import { format } from "date-fns";

interface EventSuggestion {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    location: string;
    budget_estimate: string;
    travel_time_minutes: number;
    category: string;
    suggested_attendees: string[];
    reasoning: string;
}

interface EventAssistantProps {
    onAddEvent: (data: any) => void;
}

export default function EventAssistant({ onAddEvent }: EventAssistantProps) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleReset = () => {
        setQuery("");
        setSuggestions([]);
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
        setSuggestions([]); // Clear previous

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assistant/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }
        } catch (err) {
            console.error("Search error:", err);
            // alert("Failed to get suggestions");
        } finally {
            setLoading(false);
        }
    };

    // Auto-resize textarea
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

    const formatTime = (isoString: string) => {
        try {
            return format(new Date(isoString), "MMM d, h:mm a");
        } catch {
            return isoString;
        }
    };

    const handleAddClick = (item: EventSuggestion) => {
        onAddEvent({
            title: item.title,
            description: item.description + "\n\nReasoning: " + item.reasoning,
            start_date: item.start_time.split("T")[0],
            start_time: item.start_time.split("T")[1]?.slice(0, 5) || "12:00",
            end_date: item.end_time.split("T")[0],
            end_time: item.end_time.split("T")[1]?.slice(0, 5) || "13:00",
            location: item.location,
            category: item.category,
            // We pass raw names, AddEventModal needs to handle or user selects manually
            // Logic for mapping names to IDs should be upgraded in AddEventModal later
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
                        <p className="text-sm">Thinking of great ideas...</p>
                    </div>
                )}

                {!loading && hasSearched && suggestions.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">No suggestions found. Try a different query.</p>
                )}

                {!loading && !hasSearched && (
                    <div className="text-center py-8 text-gray-400">
                        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Ask me to find events, plan outings, or suggest activities!</p>
                    </div>
                )}

                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                    {suggestions.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-800 line-clamp-2">{item.title}</h4>
                                <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 whitespace-nowrap ml-2">{item.category}</span>
                            </div>

                            <p className="text-sm text-gray-600 mb-3 line-clamp-3 flex-1">{item.description}</p>

                            <div className="space-y-2 text-xs text-gray-500 mb-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    {formatTime(item.start_time)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{item.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                        {item.suggested_attendees.length > 0 ? item.suggested_attendees.join(", ") : "Anyone"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed">
                                    <div className="flex items-center gap-1 text-green-700 font-medium">
                                        <DollarSign className="w-3 h-3" />
                                        {item.budget_estimate}
                                    </div>
                                    <div className="flex items-center gap-1 text-blue-600">
                                        <Car className="w-3 h-3" />
                                        {item.travel_time_minutes} min
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleAddClick(item)}
                                className="w-full py-2 bg-blue-50 text-blue-600 font-medium text-sm rounded hover:bg-blue-100 transition-colors mt-auto"
                            >
                                Add to Calendar
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t bg-white flex-shrink-0">
                <div className="flex items-end gap-2 border rounded-xl p-2 bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
                    <Search className="w-5 h-5 text-gray-400 mb-2 ml-1" />
                    <textarea
                        ref={textareaRef}
                        placeholder="Suggestions for this weekend..."
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
