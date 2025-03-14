import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Copy, ClipboardList, Trash2, Send, Trash2Icon, ChevronDown, ChevronRight, LogOut, Moon, Sun, Edit, FileUp, FileImage, Paperclip } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import "./App.css";
import { compressImage } from "./compressedFileUpload";
import CountUp from 'react-countup';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export default function App() {
    const [sessionCode, setSessionCode] = useState("");
    const [inputCode, setInputCode] = useState("");
    const [clipboard, setClipboard] = useState("");
    const [history, setHistory] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [deleteOne, setDeleteOne] = useState(false);
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [totalVisitor, setTotalVisitor] = useState(0);
    const [uniqueVisitor, setUniqueVisitor] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check user's system preference or saved preference
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const fetchClipboardHistory = async () => {
        if (!sessionCode) return;
        let { data, error } = await supabase
            .from("clipboard")
            .select("*")
            .eq("session_code", sessionCode);
        if (!error) setClipboard(data || []);
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setTimeout(fetchClipboardHistory, 100);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

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

                setHistory(data);
            })();
        }

        console.clear();
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

    const UploadFile = async (file, type = "file") => {
        if (!file) return toast.error("Please select a file to upload");

        // Check file size
        if (file.size > 10 * 1024 * 1024) {
            return toast.error("File size exceeds 10MB. Please upload a smaller file.");
        }

        // Generate 3 random characters
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let random = "";
        for (let i = 0; i < 3; i++) {
            random += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Show loading toast
        const toastId = toast.loading("Uploading file...");

        // Compress image if it is an image
        if (file.type.includes("image")) {
            try {
                const compressedFile = await compressImage(file);
                file = compressedFile;
            } catch (error) {
                return toast.error("An error occurred while compressing image");
            }
        }

        try {
            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage.from("clipboard").upload(`files/${random + file.name}`, file);

            if (error) throw error;

            // Get the URL of the uploaded file
            const url = `https://qthpintkaihcmklahkwf.supabase.co/storage/v1/object/public/${data.fullPath}`;
            setFileUrl({ url, ...data, type });

            // Update toast to success
            toast.success("File uploaded successfully!", { id: toastId });
        } catch (error) {
            // Update toast to error
            toast.error("An error occurred while uploading file", { id: toastId });
        }
    };

    const updateClipboard = async () => {
        // if fileURL exists, then it is a file so text can be empty
        if (!clipboard && !fileUrl) return toast.error("Please enter some text to update clipboard");
        if (clipboard.length > 15000) return toast.error("Clipboard content is too long. Please keep it under 15000 characters.");

        let firstTime = false;

        if (!sessionCode) {
            await createSession();
            firstTime = true;
        }
        const code = localStorage.getItem("sessionCode");
        await supabase.from("clipboard").insert([{
            session_code: code,
            content: clipboard,
            fileUrl: fileUrl ? fileUrl.url : null,
            file: fileUrl ? fileUrl : null
        }]);

        if (history.length == 0 && firstTime) {
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

        setFileUrl(null);
        setFile(null);
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
        // delete all items from database with session code if file exists delete from storage
        history.forEach(async (item) => {
            if (item.file) {
                await supabase.storage.from("clipboard").remove([item.file.name]);
            }
        });

        const { error } = await supabase.from("clipboard").delete().eq("session_code", sessionCode);
        if (error) {
            toast.error("An error occurred while deleting clipboard history");
            return;
        }
        setHistory([]);
        toast.success("Clipboard history deleted successfully!");
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleEdit = async (id) => {
        setDeleteOne(true);
        // fetch item from database
        const content = history.find((item) => item.id === id).content;
        setClipboard(content);
        // delete item from database
        await supabase.from("clipboard").delete().eq("id", id);

        // set file if exists
        setFileUrl(history.find((item) => item.id === id).file);

        // delete item from history
        const newHistory = history.filter((item) => item.id !== id);
        setHistory(newHistory);
        setDeleteOne(false);

        toast.success("Clipboard content added to editor!");
    }

    
    const getCounter=async()=>{
        const {data,error}=await supabase.from("counter").select("*");
        if(error) throw error;
        setTotalVisitor(data[0].total);
        setUniqueVisitor(data[0].unique);
        return data;
    }

    const updateDocument = async (collection, id, data) => {
        try {
            const { data: updatedData, error } = await supabase
                .from(collection)
                .update(data)
                .eq("id", id)
                .select()
                .single();
            if (error) {
                throw new Error(error.message);
            }
            return updatedData;
        } catch (err) {
            throw new Error(err.message);
        }
    }

    const setVisitedCookie=async()=>{
        const date = new Date();
        date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        const cookieOptions={
            path:"/",
            expires:date.toUTCString(),
            sameSite:"strict",
            secure:true
        }

        // Convert the cookie options to a string
        const cookieString = Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');


        document.cookie = `visited=true; ${cookieString}`;
    }

    const getVisitedCookie=()=>{
        const cookies=document.cookie.split(';');
        const visitedCookie=cookies.filter(cookie=>cookie.includes("visited"));
        if(visitedCookie.length>0){
            return true;
        }
        else{
            return false;
        }
    }
    
    const uniqueCounter=async()=>{
        try{
            const res=await getCounter();
            const data = {
                "unique": res[0].unique + 1,
                "total": res[0].total + 1,
            }
            const res2 = await updateDocument("counter", res[0].id, data);
            return res2;
        }catch(err){
            throw new Error(err.message);
        }
    }

    const totalCounter = async () => {
        try {
            const res = await getCounter();
            if (!res || !res[0]) {
                console.error("No counter data found");
                return null;
            }
            
            const data = {
                unique: res[0].unique,
                total: res[0].total + 1
            };
        
            const updatedCounter = await updateDocument("counter", res[0].id, data);
  
            return updatedCounter;
        } catch (err) {
            throw new Error(err.message);
        }
    }

    const updateCounter=async()=>{
        try{
            const visited=await getVisitedCookie();
            if(visited){
                const res=await totalCounter();
                return res;
            }
            else{
                setVisitedCookie();
                const res=await uniqueCounter();
                return res;
            }
        }
        catch(error){
            throw new Error(error.message);
        }
    }

    const counter = async () => {
        await updateCounter();
    }

    


    useEffect(()=>{
        counter();
    },[]);



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
        
        // clear console 
        console.clear();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionCode, isOffline]);

    return (
        <div className={`flex relative flex-col items-center min-h-screen md:p-6 p-3 md:pt-16 pt-16
            ${isDarkMode ? 'bg-gray-950 text-gray-200' : 'bg-gray-200 text-gray-900'}`}>
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
                className="fixed top-4 z-[100] right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 
                text-gray-900 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className={`max-w-5xl lg:max-w-4xl md:max-w-3xl w-full shadow-lg rounded-2xl md:p-6 p-4 space-y-5 
                ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <h1 className={`md:text-3xl text-2xl font-extrabold text-center 
                    ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    Clipboard Sync
                </h1>

                {isOffline && <div className={`w-fit mx-auto bg-red-100 text-red-700 p-2 py-1 rounded-lg
                    ${isDarkMode ? 'bg-red-300 text-red-800' : 'bg-red-100 text-red-700'}`}>
                    You are offline. Please connect to the internet to sync clipboard content.
                </div>}

                {sessionCode && <div className="w-full flex items-center justify-center flex-col">
                    <div className={`text-lg text-center items-center 
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
                    </div>
                    <p className={`text-sm text-center max-w-xl px-3 
                        ${isDarkMode ? 'text-gray-400' : 'text-gray-900'}`}>
                        (Join on another device using the code to sync clipboard content between devices.)
                    </p>
                </div>}

                <div className="flex gap-2">
                    <input
                        className={`border p-2 py-1.5 rounded-lg flex-1 
                            ${isDarkMode ? 'bg-slate-800 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                        placeholder="Enter session code to retrieve"
                        value={inputCode.toUpperCase()}
                        onChange={(e) => setInputCode(e.target.value)}
                    />
                    <button className={` font-medium hover:bg-green-600 hover:scale-[101%] transition active:bg-green-700 px-4 py-1.5 rounded-lg ${isDarkMode ? `text-gray-800 bg-green-500` : `text-white bg-green-600`}`} onClick={joinSession}>Join</button>
                </div>

                <div className="flex flex-col gap-3">
                    <textarea
                        rows={6}
                        className={`border p-3 w-full rounded-lg focus:ring-2 focus:ring-blue-400 
                        ${isDarkMode ? 'bg-slate-800 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                        placeholder="Type or paste clipboard content here..."
                        value={clipboard}
                        onChange={(e) => setClipboard(e.target.value)}
                    />

                    <div className="flex flex-wrap md:gap-2 gap-1.5">
                        <input type="file" className="hidden" id="attachfile" accept=".txt" onChange={async (e) => {
                            const file = e.target.files[0];
                            // Upload file to Supabase Storage
                            await UploadFile(file);
                            // clear file input
                            e.target.value = null;
                        }} />

                        <label htmlFor="attachfile" className={`flex w-fit items-center gap-2 cursor-pointer ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white active:bg-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300 active:bg-gray-400'}  border  hover:scale-[101%] py-1.5 md:px-4 px-3 rounded-full text-sm`}>
                            <Paperclip className="text-green-500" size={18} /> Attach File
                        </label>

                        <input type="file" className="hidden" id="attachimage" accept="image/*" onChange={async (e) => {
                            const file = e.target.files[0];
                            // Upload file to Supabase Storage
                            await UploadFile(file, "image");

                            // clear file input
                            e.target.value = null;
                        }} />

                        <label htmlFor="attachimage" className={`flex w-fit items-center gap-2 cursor-pointer border hover:scale-[101%] ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white active:bg-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300 active:bg-gray-400'} py-1.5 md:px-4 px-3 rounded-full text-sm`}>
                            <FileImage className="text-rose-500" size={18} /> Attach Image
                        </label>

                        <input type="file" className="hidden" id="file" accept=".txt" onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setFile(file);

                            const reader = new FileReader();
                            reader.onload = () => {
                                const text = reader.result;
                                setClipboard(text);
                            };
                            reader.readAsText(file);
                            toast.success("File selected successfully!");

                            // clear file input
                            e.target.value = null;
                        }} />

                        <label htmlFor="file" className={`hidden md:flex w-fit items-center gap-2 cursor-pointer border hover:scale-[101%] ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white active:bg-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300 active:bg-gray-400'} py-1.5 md:px-4 px-3 rounded-full text-sm`}>
                            <FileUp className="text-blue-500" size={18} /> Import Text File
                        </label>
                    </div>
                </div>


                {fileUrl &&
                    <div className={`flex gap-2 items-center p-2 py-1.5 rounded-lg 
                            ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        <FileUp size={18} className="text-blue-500" />
                        <p className={`flex-1 truncate text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{fileUrl.path}</p>
                        <button className="text-red-500 active:text-red-700 active:scale-95" onClick={() => {
                            // delete file from storage
                            supabase.storage.from("clipboard").remove([fileUrl.name]);
                            setFileUrl(null);
                            setFile(null);

                            toast.success("File removed successfully!");
                        }}><Trash2 size={19} /></button>
                    </div>
                }


                <div className="flex gap-2 flex-wrap">
                    <button className={`flex-1 min-w-32 flex items-center justify-center transition gap-2 bg-blue-500 hover:bg-blue-600 hover:scale-[101%] active:bg-blue-700 ${isDarkMode ? 'text-black' : "text-white"} py-2 rounded-lg`} onClick={addClipboardText}><ClipboardList size={18} /> Paste Text</button>
                    <button className={`flex-1 min-w-32 flex items-center justify-center transition gap-2 bg-red-500 hover:bg-red-600 hover:scale-[101%] active:bg-red-700  ${isDarkMode ? 'text-black' : "text-white"} py-2 rounded-lg`} onClick={() => {
                        setClipboard("");
                        supabase.storage.from("clipboard").remove([fileUrl.name]);
                        setFileUrl(null);
                        setFile(null);
                        toast.success("Clipboard cleared successfully!");
                    }}><Trash2 size={18} /> Clear</button>
                    <button className={`flex-1 min-w-48 flex items-center justify-center transition gap-2 hover:bg-green-600 hover:scale-[101%] active:bg-green-700  ${isDarkMode ? 'text-black bg-green-500' : "text-white bg-green-600"} py-2 rounded-lg`} onClick={updateClipboard}><Send size={18} /> Send to Clipboard</button>
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
                        <button aria-label="Delete All Clipboards" className="text-red-500 active:text-red-700 active:scale-95 flex gap-2" onClick={deleteAll}><Trash2Icon size={19} /></button>
                    </div>
                    <ul className="mt-4 space-y-2">
                        {history.map((item, index) => (
                            <li key={item.id} className={`flex relative justify-between pb-6 items-start p-2 py-2.5 gap-2 rounded-lg shadow 
                                ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                <div className="flex gap-1 items-start">
                                    <button aria-label="Expand Content" className="text-blue-500 transition" onClick={() => toggleExpand(item.id)}>
                                        {expandedId !== item.id ? <ChevronRight size={18} /> : <ChevronDown size={19} />}
                                    </button>
                                    <div className="flex flex-col">
                                        <p onClick={() => toggleExpand(item.id)} className={`text-sm flex-1 cursor-pointer truncate text-wrap w-fit
                                        ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {expandedId === item.id ? item.content : item.content.length > 180 ? item.content.substring(0, 180) + "..." : item.content.substring(0, 180)}
                                        </p>
                                        {item.file && <div className={`border flex items-center gap-1 rounded ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-100'
                                            }  px-1 ${item.content.length === 0 ? 'mt-6' : 'mt-3'} `}>
                                            <div>{item.file && item.file.type === "file" ? <Paperclip size={16} className="text-green-500" /> : <FileImage size={16} className="text-rose-500" />}</div>
                                            <div>
                                                {
                                                    item.file && <a href={item.fileUrl}
                                                        className="text-blue-500 text-sm hover:underline truncate"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >

                                                        {/* truncate file path (include first 5 letters last 2 letters with .extention if filename is large else show it in full) */}
                                                        {item.file.path.length > 34 ? item.file.path.substring(6, 10) + "..." + item.file.path.substring(item.file.path.length - 7) : item.file.path.substring(6)}
                                                    </a>
                                                }
                                            </div>
                                        </div>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button aria-label="Edit Clipboard" className="text-green-500 active:text-green-700 active:scale-95" onClick={() => handleEdit(item.id)}><Edit size={19} /></button>
                                    <button aria-label="Copy Content" className="text-blue-500 active:text-blue-700 active:scale-95" onClick={() => copyToClipboard(item.content)}><Copy size={19} /></button>
                                </div>

                                <p className={`text-xs absolute bottom-1 right-1.5 font-medium text-gray-400`}>
                                    {new Date(item.created_at).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <footer className={`mt-6 text-center text-sm 
                ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div>
                    <div className="mb-5">
                        <div className='bg-[#091218] border-gray-800 border px-4 pr-2 py-1.5 rounded-xl lg:order-2 md:order-2 order-1'>
                <div className='flex items-center gap-2'><span className='text-gray-400'>Total Visitors : </span> <div className='w-10 text-sky-600'><CountUp end={totalVisitor} enableScrollSpy={true} /></div></div>
                <div className='flex items-center gap-2'><span className='text-gray-400'>Unique Visitors : </span> <div className='w-10 text-sky-600'><CountUp end={uniqueVisitor} enableScrollSpy={true} /></div></div>
              </div>
                        </div>
                        <div>
                            Made with ❤️ by <a href="https://sudhanshur.vercel.app" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Sudhanshu Ranjan</a>
                        </div>
                        
                    </div>
            </footer>
        </div>
    );
}
