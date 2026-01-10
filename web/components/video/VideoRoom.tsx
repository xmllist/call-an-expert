'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { Video, Mic, MicOff, PhoneOff, Maximize, Users } from 'lucide-react';

interface VideoRoomProps {
  roomUrl: string;
  token?: string;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface DailyCallFrame {
  join: (options: { url: string; token?: string }) => Promise<void>;
  leave: () => void;
  destroy: () => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  iframe: HTMLIFrameElement | null;
}

// Dynamic import of Daily.js to avoid SSR issues
let DailyIframe: any;

export function VideoRoom({
  roomUrl,
  token,
  onJoined,
  onLeft,
  onError,
  className,
}: VideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCallFrame | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const initDaily = useCallback(async () => {
    if (!containerRef.current || !roomUrl) return;

    try {
      // Dynamically import Daily.js
      if (!DailyIframe) {
        const module = await import('@daily-co/daily-js');
        DailyIframe = module.default;
      }

      // Clean up existing frame
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
      }

      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
        showLeaveButton: false,
        showFullscreenButton: true,
        showLocalVideo: true,
        showParticipantsBar: true,
      });

      callFrameRef.current = callFrame as unknown as DailyCallFrame;

      // Event handlers
      callFrame.on('joined-meeting', () => {
        setIsJoined(true);
        setIsJoining(false);
        onJoined?.();
      });

      callFrame.on('left-meeting', () => {
        setIsJoined(false);
        onLeft?.();
      });

      callFrame.on('participant-joined', () => {
        setParticipantCount((prev) => prev + 1);
      });

      callFrame.on('participant-left', () => {
        setParticipantCount((prev) => Math.max(1, prev - 1));
      });

      callFrame.on('error', (err: Error) => {
        setError(err.message);
        setIsJoining(false);
        onError?.(err);
      });

      // Join the room
      setIsJoining(true);
      await callFrame.join({ url: roomUrl, token });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join video call';
      setError(message);
      setIsJoining(false);
      onError?.(err as Error);
    }
  }, [roomUrl, token, onJoined, onLeft, onError]);

  useEffect(() => {
    initDaily();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
      }
    };
  }, [initDaily]);

  const handleLeave = useCallback(() => {
    if (callFrameRef.current) {
      callFrameRef.current.leave();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    // Note: Daily.js doesn't have a direct mute API in their prebuilt UI
    // This would need custom implementation
    setIsMuted((prev) => !prev);
  }, []);

  const handleToggleVideo = useCallback(() => {
    setIsVideoOff((prev) => !prev);
  }, []);

  if (error) {
    return (
      <div className={cn('bg-muted rounded-lg p-8 text-center', className)}>
        <div className="max-w-md mx-auto">
          <p className="text-destructive font-medium">Failed to join video call</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <Button onClick={initDaily} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative bg-gray-900 rounded-lg overflow-hidden', className)}>
      {/* Video container */}
      <div ref={containerRef} className="h-full" />

      {/* Loading overlay */}
      {isJoining && (
        <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4" />
            <p>Connecting to session...</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      {isJoined && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleToggleMute}
              className={cn(isMuted && 'bg-red-500 hover:bg-red-600')}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleToggleVideo}
              className={cn(isVideoOff && 'bg-red-500 hover:bg-red-600')}
            >
              {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleLeave}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Participant count */}
      {isJoined && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 rounded-full px-3 py-1.5 text-white text-sm">
          <Users className="h-4 w-4" />
          <span>{participantCount}</span>
        </div>
      )}
    </div>
  );
}

function VideoOff({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L22 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
