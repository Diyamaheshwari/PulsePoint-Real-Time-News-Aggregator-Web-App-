let webSocketService = null;

const setWebSocketService = (service) => {
  webSocketService = service;
};

const getWebSocketService = () => {
  if (!webSocketService) {
    console.warn('WebSocket service not initialized');
  }
  return webSocketService;
};

module.exports = {
  setWebSocketService,
  getWebSocketService
};
