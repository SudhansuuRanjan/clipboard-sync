import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Copy, ClipboardList, Trash2, PlusCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
    const [sessionCode, setSessionCode] = useState("");
    const [inputCode, setInputCode] = useState("");
    const [clipboard, setClipboard] = useState("");
    const [history, setHistory] = useState([]);

    // Load session from local storage on mount
    useEffect(() => {
        const storedSession = localStorage.getItem("sessionCode");
        if (storedSession) {
            setSessionCode(storedSession);
        }
    }, []);

    // Create a session with a random 6-character code
    const createSession = async () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        setSessionCode(newCode);
        localStorage.setItem("sessionCode", newCode);
    };

    // Join an existing session and fetch clipboard history
    const joinSession = async () => {
        if (!inputCode.trim()) return;
        setSessionCode(inputCode);
        localStorage.setItem("sessionCode", inputCode);

        const { data, error } = await supabase
            .from("clipboard")
            .select("content")
            .eq("session_code", inputCode)
            .order("created_at", { ascending: false });

        if (!error) setHistory(data.map((item) => item.content));
    };

    // Update clipboard and save to Supabase
    const updateClipboard = async () => {
        if (!sessionCode || !clipboard.trim()) return;
        await supabase.from("clipboard").insert([{ session_code: sessionCode, content: clipboard }]);
setClipboard("");
    };

    // Copy text to clipboard
    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
    };

    // Add clipboard text (Fix for Firefox)
    const addClipboardText = () => {
        navigator.clipboard.readText().then((text) => {
            if (text.trim()) {
                setClipboard(text);
            } else {
                alert("No text found in clipboard");
            }
        }).catch(() => {
            alert("Clipboard access denied. Try manually pasting.");
        });
    };

    // Listen for realtime updates
    useEffect(() => {
        if (!sessionCode) return;

        const channel = supabase
            .channel("clipboard")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "clipboard" }, (payload) => {
                if (payload.new.session_code === sessionCode) {
                    setHistory((prev) => [payload.new.content, ...prev]);
                    setClipboard(payload.new.content);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionCode]);

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100 md:p-6 p-3">
            <div className="max-w-3xl w-full bg-white shadow-lg rounded-2xl md:p-6 p-4 space-y-6">
                <h1 className="text-3xl font-bold text-center text-gray-800">Clipboard Sync</h1>
                {!sessionCode ? (
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg" onClick={createSession}>
                        Create New Session
                    </button>
                ) : (
                    <p className="text-lg text-center text-gray-600">Session Code: <strong className="text-blue-600">{sessionCode}</strong></p>
                )}

                <div className="flex gap-2">
                    <input
                        className="border p-2 rounded-lg flex-1"
                        placeholder="Enter session code"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                    />
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg" onClick={joinSession}>
                        Join
                    </button>
                </div>

                <textarea
                    rows={5}
                    className="border p-3 w-full rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-400"
                    placeholder="Type or paste clipboard content here..."
                    value={clipboard}
                    onChange={(e) => setClipboard(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                    <button className="flex-1 min-w-48 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg" onClick={addClipboardText}>
                        <ClipboardList size={18} /> Add Clipboard Text
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg" onClick={() => setClipboard("")}> 
                        <Trash2 size={18} /> Clear
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg" onClick={updateClipboard}>
                        <PlusCircle size={18} /> Share
                    </button>
                </div>
            </div>

            {history.length > 0 && (
                <div className="max-w-3xl w-full bg-white shadow-lg rounded-2xl p-6 mt-6">
                    <h2 className="text-xl font-semibold text-gray-800">Clipboard History</h2>
                    <ul className="mt-4 space-y-2">
                        {history.map((item, index) => (
                            <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow">
                                <span className="text-gray-600 truncate">{item}</span>
                                <button className="text-blue-500 hover:text-blue-700" onClick={() => copyToClipboard(item)}>
                                    <Copy size={18} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <footer className="mt-6 text-center text-gray-500 text-sm">
                Made with ❤️ by <a href="https://sudhanshur.vercel.app" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Sudhanshu Ranjan</a>
            </footer>
        </div>
    );
}
