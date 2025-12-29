import { useState, useEffect, useMemo } from "react";
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

interface Event {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    category?: string;
    attendees?: any[];
    driver?: any;
}

interface CalendarViewProps {
    events: Event[];
    users?: any[];
    isFamilyView?: boolean;
    onSelectSlot: (slot: { start: Date; end: Date; resourceId?: number }) => void;
    onSelectEvent?: (event: any) => void;
}

export default function CalendarView({ events, users, isFamilyView, onSelectSlot, onSelectEvent }: CalendarViewProps) {
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        if (isFamilyView) {
            setView(Views.DAY);
        } else if (window.innerWidth < 768) {
            setView(Views.DAY);
        } else {
            setView(Views.MONTH);
        }
    }, [isFamilyView]);

    const resources = useMemo(() => {
        if (!isFamilyView || !users) return undefined;
        return users.map(u => ({ id: u.id, title: u.name }));
    }, [isFamilyView, users]);

    const validEvents = useMemo(() => {
        const processedEvents: any[] = [];
        const ensureUTC = (str: string) => str.endsWith("Z") ? str : str + "Z";

        events.forEach(evt => {
            const start = new Date(ensureUTC(evt.start_time));
            const end = new Date(ensureUTC(evt.end_time));
            const baseEvent = {
                id: evt.id,
                title: evt.title,
                start,
                end,
                resource: evt
            };

            if (isFamilyView) {
                // Determine which resources (users) this event belongs to
                const resourceIds = new Set<number>();

                // Attendees
                if (evt.attendees) {
                    evt.attendees.forEach(a => resourceIds.add(a.id));
                }

                // Driver
                if (evt.driver) {
                    resourceIds.add(evt.driver.id);
                }

                if (resourceIds.size === 0) {
                    // If no assigned users, maybe show in a default column or ignore?
                    // For now, let's map it to "Unassigned" or just don't show in swimlane if truly strictly 1:1.
                    // But usually events have at least a creator?
                    // Let's add it to the creator if available?
                    // Or just leave it out.
                } else {
                    resourceIds.forEach(uid => {
                        processedEvents.push({
                            ...baseEvent,
                            resourceId: uid // Assign to this column
                        });
                    });
                }
            } else {
                processedEvents.push(baseEvent);
            }
        });

        return processedEvents;
    }, [events, isFamilyView]);

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
                onSelectSlot={(slotInfo) => onSelectSlot({
                    start: slotInfo.start as Date,
                    end: slotInfo.end as Date,
                    // @ts-ignore
                    resourceId: slotInfo.resourceId
                })}
                onSelectEvent={(event) => onSelectEvent && onSelectEvent(event.resource)}
                eventPropGetter={eventStyleGetter}

                // Controlled props
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}

                views={[Views.MONTH, Views.WEEK, Views.DAY]}

                // Resource props
                resources={resources}
                resourceIdAccessor="id"
                resourceTitleAccessor="title"
            />
        </div>
    );
}
