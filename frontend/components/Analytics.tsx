"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Users, Clock } from "lucide-react";

export default function Analytics() {
    const [events, setEvents] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [matrix, setMatrix] = useState<any>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [eventsRes, usersRes] = await Promise.all([
                axios.get("http://localhost:8000/api/events/"),
                axios.get("http://localhost:8000/api/users/")
            ]);
            setEvents(eventsRes.data);
            setUsers(usersRes.data);
            calculateMatrix(eventsRes.data, usersRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const calculateMatrix = (events: any[], users: any[]) => {
        // Init matrix: { "User1": { "User2": hours, "User3": hours } }
        const mat: any = {};
        users.forEach(u1 => {
            mat[u1.name] = {};
            users.forEach(u2 => {
                mat[u1.name][u2.name] = 0;
            });
        });

        events.forEach(evt => {
            if (!evt.attendees || evt.attendees.length < 2) return;

            const duration = (new Date(evt.end_time).getTime() - new Date(evt.start_time).getTime()) / (1000 * 60 * 60);

            // For every pair in attendees, add duration
            for (let i = 0; i < evt.attendees.length; i++) {
                for (let j = 0; j < evt.attendees.length; j++) {
                    if (i === j) continue;
                    const name1 = evt.attendees[i].name;
                    const name2 = evt.attendees[j].name;

                    if (mat[name1] && mat[name1][name2] !== undefined) {
                        mat[name1][name2] += duration;
                    }
                }
            }
        });

        setMatrix(mat);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Time Together
            </h3>

            {users.length < 2 ? (
                <p className="text-sm text-gray-500">Add more family members to see insights.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="p-2"></th>
                                {users.map(u => (
                                    <th key={u.id} className="p-2 font-medium text-gray-600">{u.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(rowUser => (
                                <tr key={rowUser.id}>
                                    <td className="p-2 font-medium text-gray-600">{rowUser.name}</td>
                                    {users.map(colUser => (
                                        <td key={colUser.id} className="p-2 text-center">
                                            {rowUser.id === colUser.id ? (
                                                <span className="text-gray-300">-</span>
                                            ) : (
                                                <span className={`px-2 py-1 rounded ${matrix[rowUser.name]?.[colUser.name] > 5 ? "bg-green-100 text-green-800" :
                                                    matrix[rowUser.name]?.[colUser.name] > 0 ? "bg-blue-50 text-blue-800" :
                                                        "text-gray-400"
                                                    }`}>
                                                    {matrix[rowUser.name]?.[colUser.name]?.toFixed(1) || "0"}h
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Total Events: {events.length}
                </h4>
            </div>
        </div>
    );
}
