// Daily.co configuration and utilities
const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'your-domain.daily.co';

export interface DailyRoomConfig {
  name: string;
  url: string;
  privacy: 'public' | 'private';
  properties?: {
    exp?: number;
    nbf?: number;
    max_participants?: number;
    enable_screenshare?: boolean;
    enable_recording?: boolean;
  };
}

export const getDailyRoomUrl = (roomName: string): string => {
  return `https://${dailyDomain}/${roomName}`;
};

export const createDailyRoomName = (sessionId: string): string => {
  return `call-an-expert-${sessionId}`;
};
