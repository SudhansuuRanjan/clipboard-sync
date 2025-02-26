import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const api_url = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:3001";

const socket = io();

export default function App() {
    const [sessionCode, setSessionCode] = useState("");
    const [inputCode, setInputCode] = useState("");
    const [clipboard, setClipboard] = useState("");
    const [history, setHistory] = useState([]);

    useEffect(() => {
        socket.on("session-created", (code) => setSessionCode(code));
        socket.on("session-joined", (code) => setSessionCode(code));
        socket.on("clipboard-updated", (content) => {
            setClipboard(content);
            setHistory((prev) => [content, ...prev]);
        });
    }, []);

    const createSession = () => {
        socket.emit("create-session");
    };

    const joinSession = () => {
        socket.emit("join-session", inputCode);
    };

    const updateClipboard = () => {
        if(!sessionCode) return;
        socket.emit("clipboard-update", { sessionCode, content: clipboard });
    };

    const copyToClipBoard = (content) => {
        navigator.clipboard.writeText 
        ? navigator.clipboard.writeText(content)
        : document.execCommand("copy", false, content);
    }

    return (
        <div className="flex flex-col items-center p-6 gap-4 w-full">
            <h1 className="text-2xl font-bold text-center">Clipboard Sync</h1>
            {!sessionCode ? (
                <button className="px-4 py-1.5 bg-blue-500 text-white rounded" onClick={createSession}>
                    Create Session
                </button>
            ) : (
                <p className="text-lg">Session Code: <strong>{sessionCode}</strong></p>
            )}

            <div className="flex gap-4">
                <input
                    className="border p-1.5 rounded"
                    placeholder="Enter session code"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                />
                <button className="px-4 py-1.5 bg-green-500 active:bg-green-600 text-white rounded" onClick={joinSession}>
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
            <button className="px-4 py-1.5 bg-purple-500 active:bg-purple-600 text-white rounded" onClick={updateClipboard}>
                Share Clipboard
            </button>

            <h2 className="text-xl font-semibold mt-4">History</h2>
            <ul className="w-full border p-4 rounded bg-gray-100">
                {history.map((item, index) => (
                    <div key={index} className="p-2 border-b text-gray-500 flex justify-between items-start">
                        <div  >{index + 1}. {item}</div>
                        <button className="px-2 py-1 text-sm font-medium active:bg-blue-600 bg-blue-500 text-white rounded" onClick={() => copyToClipBoard(item)}>
                            Copy
                        </button>
                    </div>
                ))}
            </ul>


            <div className="px-4 text-center">
                <p className="text-sm text-gray-500 mt-4">
                    This is a simple clipboard sync app using Socket.IO. Open this page in multiple tabs or devices and see the magic happen!
                </p>

                <p className="text-sm text-gray-500 mt-2">
                    Made with ❤️ by <a href="https://sudhanshur.vercel.app" target="_blank" rel="noreferrer">Sudhanshu Ranjan</a>
                </p>
            </div>
        </div>
    );
}
