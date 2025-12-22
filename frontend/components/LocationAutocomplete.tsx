"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapPin, Loader2, ExternalLink } from "lucide-react";

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function LocationAutocomplete({ value, onChange, placeholder = "Search location..." }: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Sync internal query with external value if it changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Fetch if query is long enough. 
            // relying on showSuggestions state to prevent re-opening on selection
            if (query.length > 2) {
                fetchSuggestions(query);
            }
        }, 500); // Debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const isSelectionRef = useRef(false);

    const fetchSuggestions = async (searchText: string) => {
        if (isSelectionRef.current) {
            isSelectionRef.current = false;
            return;
        }

        setLoading(true);
        try {
            // Using OpenStreetMap Nominatim for free geolocation search
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: searchText,
                    format: "json",
                    addressdetails: 1,
                    limit: 5
                }
            });
            setSuggestions(response.data);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Error fetching locations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (suggestion: any) => {
        const displayName = suggestion.display_name;
        isSelectionRef.current = true; // Block next fetch
        setQuery(displayName);
        onChange(displayName);
        setShowSuggestions(false);
    };

    return (
        <div className="relative">
            <div className="relative">
                <input
                    type="text"
                    data-testid="location-input"
                    className="w-full border rounded-md p-2 pl-9"
                    value={query}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value); // Allow free typing
                    }}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                />
                {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-3" />}

                {query && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-2.5 p-1 text-blue-500 hover:bg-blue-50 rounded"
                        title="Open in Google Maps"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-[60] w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <li
                            key={idx}
                            onClick={() => handleSelect(item)}
                            className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-b-0 flex items-start gap-2"
                        >
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{item.display_name}</span>
                        </li>
                    ))}
                    <li className="p-2 text-xs text-gray-400 text-center bg-gray-50">
                        Search via OpenStreetMap
                    </li>
                </ul>
            )}

            {showSuggestions && (
                <div
                    className="fixed inset-0 z-[55]"
                    onClick={() => setShowSuggestions(false)}
                />
            )}
        </div>
    );
}
