// Shared types for the Call-an-Expert extension

export interface CodeContext {
  success: boolean;
  ide?: IDEType;
  html?: string;
  selection?: string;
  fileTree?: FileNode | Record<string, unknown> | null;
  url?: string;
  timestamp?: number;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export type IDEType = 'cursor' | 'replit' | 'v0' | 'lovable' | null;

export interface Expert {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
  rate: number; // in cents per hour
  rating: number;
  available: boolean;
}

export interface Session {
  id: string;
  expertId: string;
  userId: string;
  status: SessionStatus;
  context?: CodeContext;
  roomUrl?: string;
  durationMinutes: number;
}

export type SessionStatus = 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export interface AuthPayload {
  action: 'login' | 'logout' | 'getToken';
  token?: string;
}

export interface APIRequestPayload {
  url: string;
  method?: string;
  body?: Record<string, unknown>;
}

export interface Message<T = unknown> {
  type: string;
  payload: T;
}

export interface CaptureContextRequest {
  type: 'CAPTURE_CONTEXT';
}

export interface AuthRequest {
  type: 'AUTH_REQUEST';
  payload: AuthPayload;
}

export interface APIRequest {
  type: 'API_REQUEST';
  payload: APIRequestPayload;
}

export type ExtensionMessage = CaptureContextRequest | AuthRequest | APIRequest;
