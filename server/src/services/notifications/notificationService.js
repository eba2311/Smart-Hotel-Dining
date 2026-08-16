let io = null;

export function setSocketIO(socketServer) {
  io = socketServer;
}

const roomName = {
  branch: (id) => `branch:${id}`,
  order: (id) => `order:${id}`,
  guest: (id) => `guest:${id}`,
};

export const notificationService = {
  branch(branchId, event, payload) {
    io?.to(roomName.branch(branchId)).emit(event, payload);
  },
  order(orderId, event, payload) {
    io?.to(roomName.order(orderId)).emit(event, payload);
  },
  guest(customerId, event, payload) {
    if (customerId) io?.to(roomName.guest(customerId)).emit(event, payload);
  },
  all(event, payload) {
    io?.emit(event, payload);
  },
  rooms: roomName,
};
