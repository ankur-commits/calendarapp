"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { Mic, Square, Loader2, Check } from "lucide-react";

interface ParsedEvent {
    categories: string[];
    time_constraints: any;
    audience: string[];
    keywords: string[];
    date_range: any;
}

interface VoiceInputProps {
    onEventCreated: () => void;
    onOpenModal: (data: any) => void;
    isCompact?: boolean;
}

export default function VoiceInput({ onEventCreated, onOpenModal, isCompact = false }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState<"idle" | "listening" | "processing">("idle");
    const [transcript, setTranscript] = useState("");
    const [parsedData, setParsedData] = useState<any | null>(null);
    const [clarification, setClarification] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        setErrorMessage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                await processAudio(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsListening(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setErrorMessage("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop();
            setIsListening(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setStatus("processing");
        setErrorMessage(null);

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");

        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/voice/process`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Backend now returns { status: "success", parsed_data: { events: [], chores: [], shopping_items: [] } }
            // or { text: "...", parsed_data: ... } depending on my consistent return.
            // Let's check voice.py return: { "status": "success", "parsed_data": ... }

            const parsedData = response.data.parsed_data;
            const events = parsedData.events || [];

            setParsedData(parsedData);

            if (events.length > 0) {
                // Determine if there are missing fields for the FIRST event
                // The backend simple parse might not return "missing_fields" explicitly in the new structure unless I added it back.
                // My new nlp.py doesn't seem to populate "missing_fields" explicitly in the JSON structure rule, 
                // so we might skip the clarification flow for now or infer it.

                // Just open modal for the first event
                openModalWithData(events[0], "");
            } else {
                setErrorMessage("No events found in audio. (Chores/Shopping extraction not yet fully UI connected)");
            }

        } catch (err: any) {
            console.error("Error processing audio:", err);
            setErrorMessage("Error processing audio.");
        } finally {
            setStatus("idle");
        }
    };

    const openModalWithData = (eventData: any, currentTranscript: string) => {
        // Transform parsed event data to form data
        const startTime = eventData.start_time || "12:00";
        let endTime = eventData.end_time || "13:00";

        const formData = {
            title: eventData.title || "New Event",
            description: eventData.description || "",
            location: eventData.location || "",
            category: eventData.category || "General",
            start_date: eventData.date || new Date().toISOString().split("T")[0],
            start_time: startTime,
            end_date: eventData.date || new Date().toISOString().split("T")[0],
            end_time: endTime
        };

        onOpenModal(formData);
        // Reset state
        setTranscript("");
        setParsedData(null);
        setClarification(null);
        setStatus("idle");
    };

    const toggleRecording = () => {
        if (isListening) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    if (isCompact) {
        return (
            <div className="relative z-50">
                <button
                    onClick={toggleRecording}
                    className={`p-2 rounded-full transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    title="Voice Command"
                >
                    {status === "processing" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Mic className={`w-5 h-5 ${isListening ? "animate-bounce" : ""}`} />
                    )}
                </button>

                {clarification && (
                    <div className="absolute top-12 right-0 bg-white p-4 shadow-xl rounded-lg border w-80 z-50">
                        <p className="font-semibold text-blue-600 mb-2">Clarification Needed:</p>
                        <p className="text-gray-700 mb-3">{clarification}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={toggleRecording}
                                className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700"
                            >
                                <Mic className="w-4 h-4 inline mr-1" />
                                Reply
                            </button>
                            <button
                                onClick={() => setClarification(null)}
                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Voice Input</h3>
                {!isListening ? (
                    <button
                        onClick={startRecording}
                        disabled={status === "processing"}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors disabled:opacity-50 ${clarification ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        <Mic className="w-4 h-4" />
                        {status === "processing" ? "Processing..." : clarification ? "Reply" : "Speak Event"}
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors animate-pulse"
                    >
                        <Square className="w-4 h-4" />
                        Stop Recording
                    </button>
                )}
            </div>

            {status === "processing" && (
                <div className="flex items-center justify-center py-4 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Transcribing and analyzing...
                </div>
            )}

            {transcript && (
                <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded text-gray-700 italic">
                        "{transcript}"
                    </div>

                    {clarification && (
                        <div className="bg-orange-50 p-3 rounded border border-orange-200 text-orange-800">
                            <p className="font-semibold mb-2">{clarification}</p>
                            <p className="text-sm">Tap "Reply" to add details.</p>
                            <button
                                onClick={() => parsedData && openModalWithData(parsedData, transcript)}
                                className="mt-2 text-sm text-blue-600 hover:underline"
                            >
                                Skip and edit manually
                            </button>
                        </div>
                    )}
                </div>
            )}
            {errorMessage && (
                <div className="text-sm text-red-600 mb-2 bg-red-50 p-2 rounded">
                    {errorMessage}
                </div>
            )}
        </div>
    );
}
