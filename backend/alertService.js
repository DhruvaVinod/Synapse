// alertService.js
// Real-time alerts via Socket.io
// Notifies volunteers of nearby urgent needs & admins of high-risk clusters

let io = null;

/**
 * Call this once in server.js after creating the Socket.io instance.
 * @param {import('socket.io').Server} socketIoInstance
 */
function init(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Clients join rooms by role: 'admin' or 'volunteer:<id>'
    socket.on('join', ({ role, id }) => {
      const room = id ? `${role}:${id}` : role;
      socket.join(room);
      console.log(`   └─ joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

/**
 * Notify a specific volunteer that they have been assigned to a need.
 */
function notifyVolunteer(volunteerId, need) {
  if (!io) return;
  io.to(`volunteer:${volunteerId}`).emit('assigned', {
    message: `You have been assigned to a ${need.urgencyScore} urgency need: ${need.needType}`,
    needId: need._id,
    location: need.location,
    urgencyScore: need.urgencyScore,
  });
}

/**
 * Notify all admins of a high-urgency need that was just detected.
 */
function notifyAdminsUrgent(need) {
  if (!io) return;
  if (!['Critical', 'High'].includes(need.urgencyScore)) return;
  io.to('admin').emit('urgentNeed', {
    message: `🚨 ${need.urgencyScore} urgency need detected: ${need.needType} at ${need.location}`,
    needId: need._id,
    needType: need.needType,
    urgencyScore: need.urgencyScore,
    location: need.location,
    lat: need.lat,
    lng: need.lng,
  });
}

/**
 * Broadcast a cluster alert to all admins (called from aggregation logic).
 */
function notifyAdminsCluster(cluster) {
  if (!io) return;
  io.to('admin').emit('clusterAlert', cluster);
}

module.exports = { init, notifyVolunteer, notifyAdminsUrgent, notifyAdminsCluster };