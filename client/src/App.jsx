import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Copy, ClipboardList, Trash2, Send, Trash2Icon, ChevronDown, ChevronRight, LogOut, Moon, Sun, Edit } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
    const [sessionCode, setSessionCode] = useState("");
    const [inputCode, setInputCode] = useState("");
    const [clipboard, setClipboard] = useState("");
    const [history, setHistory] = useState([]);
    const [expandedItems, setExpandedItems] = useState({});
    const [deleteOne, setDeleteOne] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check user's system preference or saved preference
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Toggle dark mode and save preference
    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            localStorage.setItem('darkMode', JSON.stringify(newMode));
            return newMode;
        });
    };

    useEffect(() => {
        const storedSession = localStorage.getItem("sessionCode");
        if (storedSession) {
            setSessionCode(storedSession);
            (async () => {
                const { data, error } = await supabase
                    .from("clipboard")
                    .select("*")
                    .eq("session_code", storedSession.toUpperCase())
                    .order("created_at", { ascending: false });

                if (error) {
                    toast.error("An error occurred while fetching clipboard history");
                    return;
                }

                console.log(data);

                setHistory(data);
            })();
        }
    }, []);

    const createSession = async () => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let newCode = "";
        for (let i = 0; i < 5; i++) {
            newCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        await supabase.from("sessions").insert([{ code: newCode }]);

        setSessionCode(newCode);
        localStorage.setItem("sessionCode", newCode);
    };

    const joinSession = async () => {
        if (!inputCode.trim()) return toast.error("Please enter a session code");

        // Check if session exists
        const { data: sessionData, error: sessionError } = await supabase
            .from("sessions")
            .select("*")
            .eq("code", inputCode.toUpperCase());

        if (sessionData.length == 0 || sessionError) {
            toast.error("This session code does not exist. Please enter a valid code.");
            return;
        }

        setSessionCode(inputCode.toUpperCase());
        localStorage.setItem("sessionCode", inputCode.toUpperCase());

        const { data, error } = await supabase
            .from("clipboard")
            .select("*")
            .eq("session_code", inputCode.toUpperCase())
            .order("created_at", { ascending: false });

        if (error) {
            toast.error("An error occurred while fetching clipboard history");
            return;
        }

        toast.success(`Joined session ${inputCode.toUpperCase()} successfully!`);
        setInputCode("");
        setClipboard("");
        if (!error) setHistory(data);
    };

    const updateClipboard = async () => {
        if (!clipboard.trim()) return toast.error("Clipboard is empty!");
        if (clipboard.length > 15000) return toast.error("Clipboard content is too long. Please keep it under 15000 characters.");

        let fistTime = false;

        if (!sessionCode) {
            await createSession();
            fistTime = true;
        }
        const code = localStorage.getItem("sessionCode");
        await supabase.from("clipboard").insert([{ session_code: code, content: clipboard }]);

        if (history.length == 0 && fistTime) {
            // Manually fetch latest history to update UI immediately
            const { data, error: fetchError } = await supabase
                .from("clipboard")
                .select("*")
                .eq("session_code", code)
                .order("created_at", { ascending: false });

            if (!fetchError) {
                setHistory(data);
            }
        }

        setClipboard("");
        toast.success("Clipboard updated successfully!");
    };

    const copyToClipboard = (content) => {
        navigator.clipboard.writeText(content);
        toast.success("Text copied to clipboard!");
    };

    const addClipboardText = () => {
        navigator.clipboard.readText().then((text) => {
            if (text.trim()) {
                setClipboard(text);
                toast.success("Clipboard text pasted successfully!");
            } else {
                alert("Clipboard is empty or contains unsupported data.");
            }
        }).catch(() => {
            alert("An error occurred while reading clipboard");
        });
    };

    const deleteAll = async () => {
        const response = confirm("Are you sure you want to clear clipboards?");
        if (!response) return;
        if (history.length == 0) return toast.error("No items in your clipboard history");
        const { error } = await supabase.from("clipboard").delete().eq("session_code", sessionCode);
        if (error) {
            toast.error("An error occurred while deleting clipboard history");
            return;
        }
        setHistory([]);
        toast.success("Clipboard history deleted successfully!");
    };

    const toggleExpand = (index) => {
        setExpandedItems((prev) => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleEdit = async (id) => {
        setDeleteOne(true);
        // fetch item from database
        const content = history.find((item) => item.id === id).content;
        setClipboard(content);
        // delete item from database
        await supabase.from("clipboard").delete().eq("id", id);

        // delete item from history
        const newHistory = history.filter((item) => item.id !== id);
        setHistory(newHistory);
        setDeleteOne(false);

        toast.success("Clipboard content added to editor!");
    }

    useEffect(() => {
        if (!sessionCode) return;
        const channel = supabase
            .channel("clipboard")
            .on("postgres_changes", { event: "*", schema: "public", table: "clipboard" }, (payload) => {
                if (payload.new.session_code === sessionCode && payload.eventType === "INSERT") {
                    setHistory((prev) => [payload.new, ...prev]);
                    setClipboard("");
                }

                if (payload.eventType === "DELETE") {
                    if (deleteOne) {
                        setHistory([]);
                    } else {
                        setHistory((prev) => prev.filter((item) => item.id !== payload.old.id));
                    }
                }
            })

            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionCode]);

    return (
        <div className={`flex flex-col items-center min-h-screen md:p-6 p-3 md:pt-16 pt-16
            ${isDarkMode ? 'bg-gray-950 text-gray-200' : 'bg-gray-100 text-gray-900'}`}>
            <Toaster
                toastOptions={{
                    style: {
                        background: isDarkMode ? '#333' : '#fff',
                        color: isDarkMode ? '#fff' : '#000',
                    }
                }}
            />

            {/* Dark Mode Toggle Button */}
            <button
                onClick={toggleDarkMode}
                aria-label="Toggle Dark Mode"
                className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 
                text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className={`max-w-5xl lg:max-w-4xl md:max-w-3xl w-full shadow-lg rounded-2xl md:p-6 p-4 space-y-6 
                ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <h1 className={`text-3xl font-extrabold text-center 
                    ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Clipboard Sync
                </h1>

                {sessionCode && <div className="w-full flex items-center justify-center flex-col">
                    <p className={`text-lg text-center items-center 
                        ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Session Code: <strong className={isDarkMode ? 'text-blue-500' : 'text-blue-600'}>{sessionCode.toUpperCase()}</strong>
                        <button
                            aria-label="Leave Session"
                            className="text-red-500 ml-4 active:text-red-700 active:scale-95" onClick={() => {
                                const ans = confirm("Are you sure you want to leave the session?");
                                if (!ans) return;
                                setSessionCode("");
                                localStorage.removeItem("sessionCode");
                                setHistory([]);
                            }}>
                            <LogOut size={17} />
                        </button>
                    </p>
                    <p className={`text-sm text-center max-w-xl px-3 
                        ${isDarkMode ? 'text-gray-400' : 'text-gray-900'}`}>
                        (Join on another device using the code to sync clipboard content between devices.)
                    </p>
                </div>}

                <div className="flex gap-2">
                    <input
                        className={`border p-2 rounded-lg flex-1 
                            ${isDarkMode ? 'bg-slate-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="Enter session code to retrieve"
                        value={inputCode.toUpperCase()}
                        onChange={(e) => setInputCode(e.target.value)}
                    />
                    <button className={`bg-green-500 font-medium hover:bg-green-600 hover:scale-[101%] transition active:bg-green-700 px-4 py-2 rounded-lg ${isDarkMode ? `text-gray-800` : `text-white`}`} onClick={joinSession}>Join</button>
                </div>

                <textarea
                    rows={5}
                    className={`border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-400 
                        ${isDarkMode ? 'bg-slate-800 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    placeholder="Type or paste clipboard content here..."
                    value={clipboard}
                    onChange={(e) => setClipboard(e.target.value)}
                />

                <div className="flex gap-2 flex-wrap">
                    <button className="flex-1 min-w-32 flex items-center justify-center transition gap-2 bg-blue-500 hover:bg-blue-600 hover:scale-[101%] active:bg-blue-700 text-white py-2 rounded-lg" onClick={addClipboardText}><ClipboardList size={18} /> Paste Text</button>
                    <button className="flex-1 min-w-32 flex items-center justify-center transition gap-2 bg-red-500 hover:bg-red-600 hover:scale-[101%] active:bg-red-700 text-white py-2 rounded-lg" onClick={() => { setClipboard(""); toast.success("Clipboard cleared successfully!"); }}><Trash2 size={18} /> Clear</button>
                    <button className="flex-1 min-w-48 flex items-center justify-center transition gap-2 bg-green-500 hover:bg-green-600 hover:scale-[101%] active:bg-green-700 text-white py-2 rounded-lg" onClick={updateClipboard}><Send size={18} /> Send to Clipboard</button>
                </div>
            </div>

            {history.length > 0 && (
                <div className={`max-w-5xl lg:max-w-4xl md:max-w-3xl w-full shadow-lg rounded-2xl md:p-6 p-5 mt-6 
                    ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                    <div className="flex justify-between items-center">
                        <h2 className={`text-xl font-semibold 
                            ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            Clipboard History
                        </h2>
                        <button className="text-red-500 active:text-red-700 active:scale-95 flex gap-2" onClick={deleteAll}><Trash2Icon size={18} /></button>
                    </div>
                    <ul className="mt-4 space-y-2">
                        {history.map((item, index) => (
                            <li key={item.id} className={`flex justify-between items-start p-2 gap-2 rounded-lg shadow 
                                ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                <div className="flex gap-2 items-start">
                                    <button className="text-blue-500 transition" onClick={() => toggleExpand(item.id)}>
                                        {!expandedItems[item.id] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <p onClick={() => toggleExpand(item.id)} className={`text-sm flex-1 cursor-pointer truncate text-wrap w-fit
                                        ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {expandedItems[item.id] ? item.content : item.content.substring(0, 200) + (item.content.length > 200 ? "..." : "")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="text-green-500 active:text-green-700 active:scale-95" onClick={() => handleEdit(item.id)}><Edit size={18} /></button>
                                    <button className="text-blue-500 active:text-blue-700 active:scale-95" onClick={() => copyToClipboard(item.content)}><Copy size={18} /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <footer className={`mt-6 text-center text-sm 
                ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Made with ❤️ by <a href="https://sudhanshur.vercel.app" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Sudhanshu Ranjan</a>
            </footer>
        </div>
    );
}
