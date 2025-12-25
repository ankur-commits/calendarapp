"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader2, AlertTriangle, User, Trash2 } from "lucide-react";
import LocationAutocomplete from "./LocationAutocomplete";

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
    initialData?: any;
    existingEvents?: any[];
}

export default function AddEventModal({ isOpen, onClose, onEventCreated, initialData, existingEvents = [] }: AddEventModalProps) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [conflicts, setConflicts] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        start_time: "12:00",
        end_date: new Date().toISOString().split("T")[0],
        end_time: "13:00",
        location: "",
        category: "General",
        attendee_ids: [] as number[]
    });

    // Travel Time Logic
    const [travelTime, setTravelTime] = useState(0);
    const [showTravelInput, setShowTravelInput] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            if (initialData) {
                // If opening from Voice, it might provide attendee names. We should try to map them if possible,
                // but simpler for now to just let user pick IDs. 
                // Future optimization: Map string names to IDs.
                setFormData(prev => ({
                    ...prev,
                    id: initialData.id, // Store ID if present
                    title: initialData.title || "",
                    description: initialData.description || "",
                    start_date: initialData.start_date || new Date().toISOString().split("T")[0],
                    start_time: initialData.start_time || "12:00",
                    end_date: initialData.end_date || new Date().toISOString().split("T")[0],
                    end_time: initialData.end_time || "13:00",
                    location: initialData.location || "",
                    category: initialData.category || "General",
                    // Map attendees from object array if needed, or fallback to simple mapping
                    attendee_ids: initialData.attendee_ids || initialData.attendees?.map((u: any) => u.id) || []
                }));
            } else {
                // Reset to defaults if no initial data
                setFormData({
                    title: "",
                    description: "",
                    start_date: new Date().toISOString().split("T")[0],
                    start_time: "12:00",
                    end_date: new Date().toISOString().split("T")[0],
                    end_time: "13:00",
                    location: "",
                    category: "General",
                    attendee_ids: [] as number[]
                });
                // Also reset travel time state
                setTravelTime(0);
                setShowTravelInput(false);
            }
        }
    }, [isOpen, initialData]);

    // Conflict detection
    useEffect(() => {
        if (!isOpen || !formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) return;

        const start = new Date(`${formData.start_date}T${formData.start_time}`);
        const end = new Date(`${formData.end_date}T${formData.end_time}`);

        const foundConflicts = existingEvents.filter(evt => {
            const evtStart = new Date(evt.start_time);
            const evtEnd = new Date(evt.end_time);

            // Check overlaps
            const isOverlapping = (start < evtEnd && end > evtStart);
            if (!isOverlapping) return false;

            // Check if any attendees overlap OR if it's a family event
            // For now, simple conflict: If ANY time overlaps, show it (assuming single calendar view)
            // Ideally we check specific user availability.

            // Check if current event attendees overlap with existing event attendees
            const evtAttendeeIds = evt.attendees?.map((u: any) => u.id) || [];
            const commonAttendees = formData.attendee_ids.filter(id => evtAttendeeIds.includes(id));

            // Conflict if:
            // 1. Same attendees involved
            // 2. Or global "Family" event
            return commonAttendees.length > 0 || evt.category === "Family" || formData.category === "Family";
        });

        setConflicts(foundConflicts);

    }, [formData.start_date, formData.start_time, formData.end_date, formData.end_time, formData.attendee_ids, existingEvents, isOpen]);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/users/`);
            const allUsers = response.data;
            setUsers(allUsers);

            // Check current user preference
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const hiddenEmail = payload.sub;
                    const me = allUsers.find((u: any) => u.email === hiddenEmail);
                    if (me && me.preferences?.schedule_travel_time) {
                        setShowTravelInput(true);
                        // If we already have a suggestion with travel time, use it
                        if (initialData?.travel_time_minutes) {
                            setTravelTime(initialData.travel_time_minutes);
                        }
                    } else {
                        setShowTravelInput(false);
                        setTravelTime(0);
                    }
                } catch (e) { console.error("Error parsing token for prefs", e); }
            }

        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const toggleAttendee = (id: number) => {
        setFormData(prev => {
            const current = prev.attendee_ids;
            if (current.includes(id)) {
                return { ...prev, attendee_ids: current.filter(x => x !== id) };
            } else {
                return { ...prev, attendee_ids: [...current, id] };
            }
        });
    };

    if (!isOpen) return null;

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        setLoading(true);
        try {
            // @ts-ignore
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${formData.id}`);
            onEventCreated();
            onClose();
        } catch (err) {
            console.error("Error deleting event:", err);
            alert("Failed to delete event");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`).toISOString();
            const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`).toISOString();

            // Handle Travel Time Adjustment
            let finalStartDateTime = startDateTime;
            let finalDescription = formData.description;

            if (showTravelInput && travelTime > 0) {
                const startDateObj = new Date(startDateTime);
                // Subtract minutes
                startDateObj.setMinutes(startDateObj.getMinutes() - parseInt(travelTime.toString()));
                finalStartDateTime = startDateObj.toISOString();

                // Append note
                const originalTime = formData.start_time;
                finalDescription = `${finalDescription}\n\n[Scheduled with ${travelTime}m travel time. Original Event Start: ${originalTime}]`.trim();
            }

            const payload = {
                title: formData.title,
                description: finalDescription,
                start_time: finalStartDateTime,
                end_time: endDateTime,
                location: formData.location,
                category: formData.category,
                attendee_ids: formData.attendee_ids
            };

            // @ts-ignore
            if (formData.id) {
                // Update
                // @ts-ignore
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${formData.id}`, payload);
            } else {
                // Create
                await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/events/`, payload);
            }

            onEventCreated();
            onClose();
            // Reset form will happen on next open due to useEffect
        } catch (err: any) {
            console.error("Error saving event:", err);
            const errorMessage = err.response?.data?.detail || err.message || "Failed to save event";
            alert(`Failed to save event: ${JSON.stringify(errorMessage)}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-lg relative flex flex-col max-h-[90vh]">
                <div className="p-6 pb-0 flex-shrink-0 flex justify-between items-center border-b mb-4">
                    <h2 className="text-2xl font-bold">
                        {/* @ts-ignore */}
                        {formData.id ? "Edit Event" : "Add New Event"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 pb-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-md p-2"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border rounded-md p-2"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full border rounded-md p-2"
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                        </div>

                        {showTravelInput && (
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                                <label className="block text-sm font-medium text-blue-900 mb-1">
                                    Travel Time (minutes)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-24 border rounded-md p-1.5 text-sm"
                                        value={travelTime}
                                        onChange={e => setTravelTime(parseInt(e.target.value) || 0)}
                                    />
                                    <span className="text-xs text-blue-700">
                                        Checking this will shift the calendar event start time earlier by {travelTime} mins.
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border rounded-md p-2"
                                    value={formData.end_date}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <input
                                    type="time"
                                    required
                                    className="w-full border rounded-md p-2"
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Conflict Warning */}
                        {conflicts.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                <h4 className="flex items-center text-orange-800 font-semibold text-sm mb-2">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Potential Conflicts
                                </h4>
                                <ul className="text-sm text-orange-700 space-y-1">
                                    {conflicts.slice(0, 3).map(c => (
                                        <li key={c.id}>• {c.title} ({new Date(c.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</li>
                                    ))}
                                    {conflicts.length > 3 && <li>...and {conflicts.length - 3} more</li>}
                                </ul>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
                            <div className="flex flex-wrap gap-2">
                                {users.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => toggleAttendee(user.id)}
                                        className={`flex items-center px-3 py-1.5 rounded-full text-sm border transition-colors ${formData.attendee_ids.includes(user.id)
                                            ? "bg-blue-100 border-blue-300 text-blue-800"
                                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                            }`}
                                    >
                                        <User className="w-3 h-3 mr-1.5" />
                                        {user.name}
                                    </button>
                                ))}
                                {users.length === 0 && <span className="text-gray-400 text-sm">No family members found. Add them in Settings.</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                className="w-full border rounded-md p-2"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>General</option>
                                <option>Family</option>
                                <option>Work</option>
                                <option>Hobby</option>
                                <option>School</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <LocationAutocomplete
                                value={formData.location}
                                onChange={(val) => setFormData({ ...formData, location: val })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                className="w-full border rounded-md p-2"
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {/* @ts-ignore */}
                            {loading ? "Saving..." : (formData.id ? "Update Event" : "Create Event")}
                        </button>

                        {/* @ts-ignore */}
                        {formData.id && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="w-full text-red-600 py-2 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Event
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
