import { Server, Socket } from "socket.io";

const PORT = 3003;

// ─── In-Memory State ───────────────────────────────────────────────────────

interface WinnerEntry {
  prizeName: string;
  participantName: string;
  participantPhone: string;
  timestamp: number;
  campaignId: string;
}

interface PromotionMessage {
  title: string;
  content: string;
  imageUrl?: string;
  campaignId: string;
}

interface RoomClient {
  socketId: string;
  role: "customer" | "admin" | "tv";
  campaignId: string;
}

// Connected clients per campaign room
const connectedClients: Map<string, RoomClient[]> = new Map();

// Recent winners list (last 20 per campaign)
const recentWinners: Map<string, WinnerEntry[]> = new Map();

// Current promotion message per campaign
const currentPromotions: Map<string, PromotionMessage> = new Map();

// ─── Helper Functions ──────────────────────────────────────────────────────

function getCampaignRoom(campaignId: string): string {
  return `campaign:${campaignId}`;
}

function addClientToRoom(campaignId: string, client: RoomClient): void {
  const key = campaignId;
  const existing = connectedClients.get(key) || [];
  // Remove duplicate socket ids (reconnects)
  const filtered = existing.filter((c) => c.socketId !== client.socketId);
  filtered.push(client);
  connectedClients.set(key, filtered);
}

function removeClientFromRoom(socketId: string): void {
  for (const [campaignId, clients] of connectedClients.entries()) {
    const filtered = clients.filter((c) => c.socketId !== socketId);
    if (filtered.length === 0) {
      connectedClients.delete(campaignId);
    } else {
      connectedClients.set(campaignId, filtered);
    }
  }
}

function addWinner(campaignId: string, entry: WinnerEntry): void {
  const winners = recentWinners.get(campaignId) || [];
  winners.unshift(entry);
  // Keep only last 20
  if (winners.length > 20) {
    winners.length = 20;
  }
  recentWinners.set(campaignId, winners);
}

function getRecentWinners(campaignId: string): WinnerEntry[] {
  return recentWinners.get(campaignId) || [];
}

function getAdminClients(campaignId: string): string[] {
  const clients = connectedClients.get(campaignId) || [];
  return clients.filter((c) => c.role === "admin").map((c) => c.socketId);
}

function getTvClients(campaignId: string): string[] {
  const clients = connectedClients.get(campaignId) || [];
  return clients.filter((c) => c.role === "tv").map((c) => c.socketId);
}

// ─── Server Setup ──────────────────────────────────────────────────────────

const io = new Server(PORT, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

console.log(`🎡 Wheel Sync WebSocket server running on port ${PORT}`);

io.on("connection", (socket: Socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // ─── join-room ──────────────────────────────────────────────────────
  socket.on(
    "join-room",
    (data: { campaignId: string; role: "customer" | "admin" | "tv" }) => {
      const { campaignId, role } = data;
      const room = getCampaignRoom(campaignId);

      // Leave previous rooms for this socket
      const currentRooms = Array.from(socket.rooms);
      currentRooms.forEach((r) => {
        if (r !== socket.id) {
          socket.leave(r);
        }
      });

      socket.join(room);
      addClientToRoom(campaignId, {
        socketId: socket.id,
        role,
        campaignId,
      });

      console.log(
        `🚪 ${socket.id} joined room ${room} as role=${role}`
      );

      // If TV joins, send current state
      if (role === "tv") {
        // Send recent winners
        const winners = getRecentWinners(campaignId);
        socket.emit("recent-winners", { winners });

        // Send current promotion if exists
        const promo = currentPromotions.get(campaignId);
        if (promo) {
          socket.emit("promotion-display", {
            title: promo.title,
            content: promo.content,
            imageUrl: promo.imageUrl,
          });
        }
      }

      // If admin joins, send current state summary
      if (role === "admin") {
        const clients = connectedClients.get(campaignId) || [];
        socket.emit("admin-notification", {
          action: "room-joined",
          details: {
            totalClients: clients.length,
            customerCount: clients.filter((c) => c.role === "customer").length,
            adminCount: clients.filter((c) => c.role === "admin").length,
            tvCount: clients.filter((c) => c.role === "tv").length,
          },
        });
      }
    }
  );

  // ─── tv-ready ───────────────────────────────────────────────────────
  socket.on(
    "tv-ready",
    (data: { campaignId: string }) => {
      const { campaignId } = data;
      const room = getCampaignRoom(campaignId);

      console.log(`📺 TV screen ready for campaign ${campaignId}`);

      // Send recent winners to the TV
      const winners = getRecentWinners(campaignId);
      socket.emit("recent-winners", { winners });

      // Send current promotion if exists
      const promo = currentPromotions.get(campaignId);
      if (promo) {
        socket.emit("promotion-display", {
          title: promo.title,
          content: promo.content,
          imageUrl: promo.imageUrl,
        });
      }

      // Notify admins that TV is ready
      const adminSids = getAdminClients(campaignId);
      adminSids.forEach((sid) => {
        io.to(sid).emit("admin-notification", {
          action: "tv-ready",
          details: { campaignId, socketId: socket.id },
        });
      });
    }
  );

  // ─── spin-start ─────────────────────────────────────────────────────
  socket.on(
    "spin-start",
    (data: {
      codeValue: string;
      campaignId: string;
    }) => {
      const { codeValue, campaignId } = data;
      const room = getCampaignRoom(campaignId);

      console.log(
        `🎡 Spin started: code=${codeValue}, campaign=${campaignId}`
      );

      // Broadcast spin animation to all clients in the campaign room
      io.to(room).emit("spin-animation", {
        codeValue,
        targetSector: 0, // Will be updated when result is known
        duration: 5000, // Default animation duration
      });
    }
  );

  // ─── spin-result ────────────────────────────────────────────────────
  socket.on(
    "spin-result",
    (data: {
      codeValue: string;
      prizeId: string;
      prizeName: string;
      isLosing: boolean;
      campaignId: string;
      participantName: string;
      participantPhone: string;
    }) => {
      const {
        codeValue,
        prizeId,
        prizeName,
        isLosing,
        campaignId,
        participantName,
        participantPhone,
      } = data;
      const room = getCampaignRoom(campaignId);

      console.log(
        `🏆 Spin result: code=${codeValue}, prize=${prizeName}, losing=${isLosing}, participant=${participantName}`
      );

      // Broadcast spin complete to all in campaign room
      io.to(room).emit("spin-complete", {
        codeValue,
        prizeId,
        prizeName,
        isLosing,
        participantName,
      });

      // If not a losing result, add to winners and broadcast to TV
      if (!isLosing) {
        const winnerEntry: WinnerEntry = {
          prizeName,
          participantName,
          participantPhone,
          timestamp: Date.now(),
          campaignId,
        };

        addWinner(campaignId, winnerEntry);

        // Broadcast new-winner to all in campaign room (especially TV)
        io.to(room).emit("new-winner", {
          prizeName,
          participantName,
          participantPhone,
          timestamp: winnerEntry.timestamp,
        });

        // Send updated recent-winners list to TV clients
        const tvSids = getTvClients(campaignId);
        tvSids.forEach((sid) => {
          io.to(sid).emit("recent-winners", {
            winners: getRecentWinners(campaignId),
          });
        });

        // Notify admin dashboard
        const adminSids = getAdminClients(campaignId);
        adminSids.forEach((sid) => {
          io.to(sid).emit("admin-notification", {
            action: "new-winner",
            details: {
              prizeName,
              participantName,
              participantPhone,
              timestamp: winnerEntry.timestamp,
            },
          });
        });
      }
    }
  );

  // ─── admin-action ───────────────────────────────────────────────────
  socket.on(
    "admin-action",
    (data: {
      action: string;
      details: Record<string, unknown>;
      campaignId: string;
    }) => {
      const { action, details, campaignId } = data;
      const room = getCampaignRoom(campaignId);

      console.log(
        `🔧 Admin action: ${action} on campaign=${campaignId}`
      );

      // Broadcast admin action to all in campaign room
      io.to(room).emit("admin-notification", {
        action,
        details,
      });
    }
  );

  // ─── promotion-update ───────────────────────────────────────────────
  socket.on(
    "promotion-update",
    (data: {
      campaignId: string;
      title?: string;
      content?: string;
      imageUrl?: string;
    }) => {
      const { campaignId, title, content, imageUrl } = data;
      const room = getCampaignRoom(campaignId);

      console.log(
        `📢 Promotion update for campaign=${campaignId}`
      );

      // Update stored promotion message
      const promo: PromotionMessage = {
        title: title || "",
        content: content || "",
        imageUrl: imageUrl || undefined,
        campaignId,
      };
      currentPromotions.set(campaignId, promo);

      // Broadcast to TV screens in campaign room
      const tvSids = getTvClients(campaignId);
      tvSids.forEach((sid) => {
        io.to(sid).emit("promotion-display", {
          title: promo.title,
          content: promo.content,
          imageUrl: promo.imageUrl,
        });
      });

      // Notify admin dashboard
      const adminSids = getAdminClients(campaignId);
      adminSids.forEach((sid) => {
        io.to(sid).emit("admin-notification", {
          action: "promotion-updated",
          details: { title: promo.title, content: promo.content },
        });
      });
    }
  );

  // ─── Disconnect ─────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    removeClientFromRoom(socket.id);
  });
});
