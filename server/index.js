const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(express.json());

const sessions = {}; // Store active sessions

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    // Generate a session code
    socket.on("create-session", () => {
        const sessionCode = uuidv4().slice(0, 6); // Generate short session code
        sessions[sessionCode] = { clients: [socket.id] };
        socket.join(sessionCode);
        socket.emit("session-created", sessionCode);
        console.log("Session created:", sessionCode);
    });

    // Join an existing session
    socket.on("join-session", (sessionCode) => {
        if (sessions[sessionCode]) {
            sessions[sessionCode].clients.push(socket.id);
            socket.join(sessionCode);
            socket.emit("session-joined", sessionCode);
            console.log("User joined session:", sessionCode);
        } else {
            socket.emit("session-error", "Invalid session code");
        }
    });

    // Sync clipboard
    socket.on("clipboard-update", ({ sessionCode, content }) => {
        if (sessions[sessionCode]) {
            socket.to(sessionCode).emit("clipboard-updated", content);
            console.log("Clipboard updated in session:", sessionCode, content);
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));