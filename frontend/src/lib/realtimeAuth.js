export const syncRealtimeAuthToken = async (realtimeClient, accessToken) => {
  await realtimeClient.setAuth(accessToken || null);
};
