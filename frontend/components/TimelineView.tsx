
"use client";

import { format } from "date-fns";
import { Car, User } from "lucide-react";

interface TimelineViewProps {
    events: any[];
    onSelectEvent: (event: any) => void;
}

export default function TimelineView({ events, onSelectEvent }: TimelineViewProps) {
    // Sort events by time
    const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    return (
        <div className="h-full overflow-y-auto pr-2">
            <h3 className="text-xl font-bold mb-4">Timeline (Logistics View)</h3>
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
                {sortedEvents.map((event) => {
                    const commuteTime = event.commute_time_minutes;
                    const hasCommute = commuteTime && commuteTime > 0;

                    return (
                        <div key={event.id} className="relative pl-8">
                            {/* Commute Block */}
                            {hasCommute && (
                                <div className="mb-2 relative">
                                    <div className="absolute -left-[42px] top-0 bg-gray-100 rounded-full p-1.5 border border-gray-300">
                                        <Car className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div className="bg-gray-100 border border-dashed border-gray-300 rounded p-2 text-sm text-gray-600">
                                        <span className="font-semibold">{commuteTime} min drive</span> to {event.location}
                                    </div>
                                </div>
                            )}

                            {/* Event Block */}
                            <div
                                className="bg-white border rounded shadow hover:shadow-md transition-shadow cursor-pointer p-4 group"
                                onClick={() => onSelectEvent(event)}
                            >
                                <div className="absolute -left-[42px] top-2 bg-blue-500 rounded-full w-3 h-3 border-2 border-white ring-2 ring-gray-100" />

                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-sm text-gray-500 font-medium">
                                            {format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}
                                        </div>
                                        <h4 className="font-bold text-gray-800">{event.title}</h4>
                                        {event.location && <p className="text-sm text-gray-600">{event.location}</p>}
                                    </div>
                                    {event.category && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                            {event.category}
                                        </span>
                                    )}
                                </div>

                                {/* Driver Info */}
                                {(event.driver || event.attendees?.length > 0) && (
                                    <div className="mt-3 flex items-center gap-3 border-t pt-2">
                                        {event.driver && (
                                            <div className="flex items-center text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded">
                                                <Car className="w-3 h-3 mr-1" />
                                                Driver: {event.driver.name}
                                            </div>
                                        )}
                                        <div className="flex -space-x-2">
                                            {event.attendees?.map((att: any) => (
                                                <div key={att.id} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px]" title={att.name}>
                                                    {att.name[0]}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {sortedEvents.length === 0 && (
                    <div className="text-gray-500 text-center py-8">
                        No events for today.
                    </div>
                )}
            </div>
        </div>
    );
}
