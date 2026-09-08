// API base URL for the mobile app.
//
// On a physical device, set EXPO_PUBLIC_API_URL to the public URL of the
// iConnect API (no trailing slash), e.g. https://iconnect.example.com
// In the sandbox / local dev you can point it at the API server.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL as string) || 'http://localhost:3000';

export const APP_NAME = 'iConnect';
