require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors       = require('cors');
const routes     = require('./routes');
const alertService = require('./alertService');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use('/api', routes);

// ── Real-time alerts ──────────────────────────────────────────────
alertService.init(io);

const mongoose = require("mongoose");

async function startServer() {
  try {
    console.log("Trying MongoDB connection...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected SUCCESSFULLY");

    server.listen(PORT, () => {
      console.log(`Synapse backend running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("DB CONNECTION ERROR:", err.message);
  }
}

startServer();