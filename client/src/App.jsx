import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
    const [sessionCode, setSessionCode] = useState("");
    const [inputCode, setInputCode] = useState("");
    const [clipboard, setClipboard] = useState("");
    const [history, setHistory] = useState([]);

    // Create a session with a random 6-character code
    const createSession = async () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSessionCode(newCode);
    };

    // Join an existing session and fetch clipboard history
    const joinSession = async () => {
        if (!inputCode) return;
        setSessionCode(inputCode);

        const { data, error } = await supabase
            .from("clipboard")
            .select("content")
            .eq("session_code", inputCode)
            .order("created_at", { ascending: false });

        if (!error) setHistory(data.map((item) => item.content));
    };

    // Update clipboard and save to Supabase
    const updateClipboard = async () => {
        if (!sessionCode) return;

        await supabase.from("clipboard").insert([{ session_code: sessionCode, content: clipboard }]);
    };

    // Copy to clipboard
    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
    };

    // Listen for realtime updates
    useEffect(() => {
        if (!sessionCode) return;

        const subscription = supabase
            .channel("realtime:clipboard")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "clipboard" }, (payload) => {
                if (payload.new.session_code === sessionCode) {
                    setHistory((prev) => [payload.new.content, ...prev]);
                    setClipboard(payload.new.content);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [sessionCode]);

    return (
        <div className="flex flex-col items-center p-6 gap-4 w-full">
            <h1 className="text-2xl font-bold text-center">Clipboard Sync (Supabase)</h1>

            {!sessionCode ? (
                <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={createSession}>
                    Create Session
                </button>
            ) : (
                <p className="text-lg">Session Code: <strong>{sessionCode}</strong></p>
            )}

            <div className="flex md:gap-4 gap-2">
                <input
                    className="border p-1.5 rounded md:max-w-md w-full flex-1"
                    placeholder="Enter session code"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                />
                <button className="px-4 py-1.5 w-fit flex-0 bg-green-500 text-white rounded" onClick={joinSession}>
                    Join Session
                </button>
            </div>

            <textarea
                rows={5}
                className="border p-2 w-full rounded bg-gray-100"
                placeholder="Type or paste clipboard content here..."
                value={clipboard}
                onChange={(e) => setClipboard(e.target.value)}
            />
            <button className="px-4 py-2 bg-purple-500 text-white rounded" onClick={updateClipboard}>
                Share Clipboard
            </button>

            <h2 className="text-xl font-semibold mt-4">History</h2>
            <ul className="w-full border p-4 rounded bg-gray-100">
                {history.map((item, index) => (
                    <div key={index} className="p-2 border-b text-gray-500 flex justify-between items-start">
                        <div>{index + 1}. {item}</div>
                        <button className="px-2 py-1 text-sm font-medium bg-blue-500 text-white rounded" onClick={() => copyToClipboard(item)}>
                            Copy
                        </button>
                    </div>
                ))}
            </ul>

            <div className="px-4 text-center">
                <p className="text-sm text-gray-500 mt-4">
                    This is a simple clipboard sync app using Supabase Realtime Database.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Made with ❤️ by <a href="https://sudhanshur.vercel.app" target="_blank" rel="noreferrer">Sudhanshu Ranjan</a>
                </p>
            </div>
        </div>
    );
}
