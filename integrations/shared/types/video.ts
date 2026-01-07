// Video-related types - Phase 04: Real-time Integration

export interface VideoRoomConfig {
  roomName: string;
  roomUrl: string;
  expiresAt: number;
  enableChat: boolean;
  enableScreenshare: boolean;
  enableRecording: boolean;
  maxParticipants: number;
}

export interface MeetingToken {
  token: string;
  expiresAt: number;
  roomName: string;
  userId: string;
  userName: string;
  isOwner: boolean;
}

export interface ParticipantInfo {
  userId: string;
  userName: string;
  joinedAt: string;
  duration: number;
  isAudioOn: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

export interface VideoCallState {
  isJoined: boolean;
  isConnecting: boolean;
  error: string | null;
  participants: ParticipantInfo[];
  localAudioEnabled: boolean;
  localVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface VideoCallActions {
  join: () => Promise<void>;
  leave: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

export type VideoCallEvent =
  | { type: 'joined' }
  | { type: 'left' }
  | { type: 'error'; error: string }
  | { type: 'participant-joined'; participant: ParticipantInfo }
  | { type: 'participant-left'; participantId: string }
  | { type: 'participant-updated'; participant: ParticipantInfo }
  | { type: 'screen-share-started'; participantId: string }
  | { type: 'screen-share-stopped'; participantId: string };

export interface DailyRoomEvent {
  id: string;
  name: string;
  url: string;
  created_at: string;
  privacy: 'private' | 'public';
  config?: {
    exp?: number;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: 'cloud' | 'local' | false;
  };
}
