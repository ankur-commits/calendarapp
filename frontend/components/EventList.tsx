"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Calendar, MapPin, Tag } from "lucide-react";

interface Event {
    id: number;
    title: string;
    description: string;
    location: string;
    start_time: string;
    end_time: string;
    category: string;
}

export default function EventList() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Assuming user_id is obtained from context, auth, or a prop.
                // For this edit, we'll use a placeholder or a default if not provided by the user.
                // Since the instruction is to replace the URL and the code block includes `user_id`,
                // but `user_id` is not defined in the original code, we'll define a dummy one
                // to ensure syntactic correctness as per instructions.
                // In a real application, this would come from authentication or props.
                const user_id = 1; // Placeholder for syntactic correctness. User should replace this.

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/?user_id=${user_id}`);
                // Assuming the new fetch API is used, response.data needs to be parsed.
                const data = await response.json();
                setEvents(data);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch events");
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    if (loading) return <div className="text-center p-4">Loading events...</div>;
    if (error) return <div className="text-center text-red-500 p-4">{error}</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
            {events.length === 0 ? (
                <p className="text-gray-500">No events found.</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white"
                        >
                            <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                            <div className="flex items-center text-gray-600 mb-1">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span className="text-sm">
                                    {format(new Date(event.start_time), "MMM d, yyyy h:mm a")}
                                </span>
                            </div>
                            {event.location && (
                                <div className="flex items-center text-gray-600 mb-1">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="text-sm">{event.location}</span>
                                </div>
                            )}
                            <div className="flex items-center text-gray-600 mt-2">
                                <Tag className="w-4 h-4 mr-2" />
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    {event.category}
                                </span>
                            </div>
                            {event.description && (
                                <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                                    {event.description}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
