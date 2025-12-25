"use client";

import VoiceInput from "@/components/VoiceInput";

import AddEventModal from "@/components/AddEventModal";
import CalendarView from "@/components/CalendarView";
import EventAssistant from "@/components/EventAssistant";
import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";

import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";

import TimelineView from "@/components/TimelineView";
import { List, Calendar as CalendarIcon, Menu, X, Sparkles, Plus } from "lucide-react";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "timeline">("calendar");

  // Hoisted state
  const [events, setEvents] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    fetchEvents();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input/textarea, ignore
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key.toLowerCase() === "c") {
        setModalInitialData(null);
        setIsModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [refreshKey]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/events/`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleEventCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOpenModal = (data: any) => {
    setModalInitialData(data);
    setIsModalOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setModalInitialData({
      start_date: format(start, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_date: format(end, 'yyyy-MM-dd'),
      end_time: format(end, 'HH:mm')
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    // Event start/end from backend are usually ISO strings (UTC).
    // Ensure we treat them as UTC so the local conversion happens correctly.
    const ensureUTC = (str: string) => str.endsWith("Z") ? str : str + "Z";
    const startDate = new Date(ensureUTC(event.start_time));
    const endDate = new Date(ensureUTC(event.end_time));

    setModalInitialData({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      category: event.category,
      attendee_ids: event.attendees?.map((u: any) => u.id),
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      end_time: format(endDate, 'HH:mm')
    });
    setIsModalOpen(true);
  };


  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);


  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:flex h-full`}>
          <Sidebar />
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-[-40px] p-2 bg-white rounded-r-md shadow-md md:hidden text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Assistant Drawer (Mobile) */}
        {isAssistantOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsAssistantOpen(false)}
          />
        )}
        <div className={`fixed inset-y-0 right-0 z-30 w-80 bg-white shadow-xl transform transition-transform duration-300 lg:hidden ${isAssistantOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Assistant
              </h3>
              <button onClick={() => setIsAssistantOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <EventAssistant onAddEvent={(data) => {
                setIsAssistantOpen(false);
                handleOpenModal(data);
              }} />
            </div>
          </div>
        </div>

        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Action Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              {/* Context Title */}
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">My Calendar</h2>

              <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "calendar" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  title="Grid View"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "timeline" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  title="Timeline View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <VoiceInput
                isCompact={true}
                onEventCreated={handleEventCreated}
                onOpenModal={handleOpenModal}
              />

              <button
                onClick={() => {
                  setModalInitialData(null);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 text-white p-2 md:px-4 md:py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                title="Add Event (Press 'C')"
                data-testid="add-event-btn"
              >
                <span className="md:hidden"><Plus className="w-5 h-5" /></span>
                <span className="hidden md:inline">Add Event</span>
              </button>

              <button
                onClick={() => setIsAssistantOpen(true)}
                className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md lg:hidden"
                title="AI Assistant"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Main Content Scroll Area */}
          <div className="flex-1 overflow-hidden p-0 flex flex-row">
            <AddEventModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onEventCreated={handleEventCreated}
              initialData={modalInitialData}
              existingEvents={events}
            />

            {/* Calendar/Timeline Area (Flexible) */}
            <div className="flex-1 h-full p-4 md:p-8 min-w-0 overflow-hidden">
              {viewMode === "calendar" ? (
                <CalendarView
                  events={events}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                />
              ) : (
                <TimelineView
                  events={events}
                  onSelectEvent={handleSelectEvent}
                />
              )}
            </div>

            {/* Resizer Handle (Hidden on mobile) */}
            <div
              className="hidden lg:flex w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors items-center justify-center z-10"
              onMouseDown={startResizing}
            >
              <div className="h-8 w-1 bg-gray-400 rounded-full" />
            </div>

            {/* Assistant Panel (Hidden on mobile) */}
            <div
              className="hidden lg:block h-full border-l border-gray-200 bg-white"
              style={{ width: sidebarWidth }}
            >
              <div className="h-full p-4">
                <EventAssistant onAddEvent={handleOpenModal} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
