import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";

// CSS imported in layout.tsx

const locales = {
    "en-US": enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// ... interfaces ...
interface Event {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    category?: string;
}

interface CalendarViewProps {
    events: Event[];
    onSelectSlot: (slot: { start: Date; end: Date }) => void;
    onSelectEvent?: (event: any) => void;
}

export default function CalendarView({ events, onSelectSlot, onSelectEvent }: CalendarViewProps) {
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());

    // Transform API events to BigCalendar events
    const validEvents = events.map(evt => {
        // Backend returns UTC timestamps but might be missing 'Z' suffix (naive).
        // If we parse naive string, browser assumes Local, which is wrong (double conversion).
        // Force interpretation as UTC.
        const ensureUTC = (str: string) => str.endsWith("Z") ? str : str + "Z";

        const start = new Date(ensureUTC(evt.start_time));
        const end = new Date(ensureUTC(evt.end_time));
        return {
            id: evt.id,
            title: evt.title,
            start,
            end,
            resource: evt
        };
    });

    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3174ad';
        const category = event.resource.category ? event.resource.category.toLowerCase() : 'general';

        if (category === 'work') backgroundColor = '#ef4444'; // Red
        if (category === 'family') backgroundColor = '#10b981'; // Green
        if (category === 'hobby') backgroundColor = '#f59e0b'; // Amber

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <div className="h-full bg-white p-4 rounded-lg shadow-sm flex flex-col">
            <Calendar
                localizer={localizer}
                events={validEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ flex: 1, minHeight: 0 }}
                selectable
                onSelectSlot={onSelectSlot}
                onSelectEvent={(event) => onSelectEvent && onSelectEvent(event.resource)}
                eventPropGetter={eventStyleGetter}

                // Controlled props
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}

                views={[Views.MONTH, Views.WEEK, Views.DAY]}
            />
        </div>
    );
}
