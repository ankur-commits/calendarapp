import { Calendar, ShoppingCart, CheckSquare, MapPin, Clock, Plus, Check } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface ActionCardProps {
    type: 'event' | 'shopping' | 'todo';
    data: any;
    onAdd: (data: any) => Promise<void>;
}

export default function ActionCard({ type, data, onAdd }: ActionCardProps) {
    const [added, setAdded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        setLoading(true);
        try {
            await onAdd(data);
            setAdded(true);
        } catch (error) {
            console.error("Failed to add item", error);
        } finally {
            setLoading(false);
        }
    };

    const renderEventCard = () => (
        <>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800 line-clamp-1">{data.title}</h4>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded whitespace-nowrap ml-2">Event</span>
            </div>
            <div className="space-y-2 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {data.start_time ? format(new Date(data.start_time), "MMM d, h:mm a") : "Time TBD"}
                </div>
                {data.location && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{data.location}</span>
                    </div>
                )}
            </div>
        </>
    );

    const renderShoppingCard = () => (
        <>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800 line-clamp-1">{data.name}</h4>
                <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded whitespace-nowrap ml-2">Shopping</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Category: {data.category || "General"}</p>
        </>
    );

    const renderToDoCard = () => (
        <>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800 line-clamp-1">{data.title}</h4>
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded whitespace-nowrap ml-2">To Do</span>
            </div>
            <div className="space-y-2 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    {data.due_date ? format(new Date(data.due_date), "MMM d (Due)") : "No due date"}
                </div>
                {data.assigned_to && (
                    <div className="flex items-center gap-2">
                        <CheckSquare className="w-3 h-3 flex-shrink-0" />
                        <span>Assigned to: {data.assigned_to}</span>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div className={`bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col ${added ? 'opacity-75 bg-gray-50' : ''}`}>
            <div className="flex-1">
                {type === 'event' && renderEventCard()}
                {type === 'shopping' && renderShoppingCard()}
                {type === 'todo' && renderToDoCard()}
            </div>

            <button
                onClick={handleAdd}
                disabled={added || loading}
                className={`w-full py-2 flex items-center justify-center gap-2 text-sm font-medium rounded transition-colors mt-auto ${added
                        ? "bg-green-100 text-green-700 cursor-default"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
            >
                {loading ? (
                    <span className="animate-spin">...</span>
                ) : added ? (
                    <>
                        <Check className="w-4 h-4" /> Added
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4" /> Add
                    </>
                )}
            </button>
        </div>
    );
}
