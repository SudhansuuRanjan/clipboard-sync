require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// Define Clipboard Schema
const clipboardSchema = new mongoose.Schema({
    sessionCode: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const Clipboard = mongoose.model("Clipboard", clipboardSchema);

const sessions = {}; // Store active sessions

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Generate a session code
    socket.on("create-session", async () => {
        const sessionCode = uuidv4().slice(0, 6);
        sessions[sessionCode] = { clients: [socket.id] };
        socket.join(sessionCode);
        socket.emit("session-created", sessionCode);
        console.log("Session created:", sessionCode);
    });

    // Join an existing session
    socket.on("join-session", async (sessionCode) => {
        if (sessions[sessionCode]) {
            sessions[sessionCode].clients.push(socket.id);
            socket.join(sessionCode);
            socket.emit("session-joined", sessionCode);

            // Send previous clipboard history
            const history = await Clipboard.find({ sessionCode }).sort({ createdAt: -1 }).limit(10);
            socket.emit("clipboard-history", history);
            console.log("User joined session:", sessionCode);
        } else {
            socket.emit("session-error", "Invalid session code");
        }
    });

    // Sync clipboard & store in DB
    socket.on("clipboard-update", async ({ sessionCode, content }) => {
        if (sessions[sessionCode]) {
            const clipboardEntry = new Clipboard({ sessionCode, content });
            await clipboardEntry.save();

            socket.to(sessionCode).emit("clipboard-updated", content);
            console.log("Clipboard updated in session:", sessionCode, content);
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
