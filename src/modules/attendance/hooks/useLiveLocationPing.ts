import { useEffect, useRef } from 'react';
import { postLiveLocation } from '../services/attendance';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type UseLiveLocationPingOptions = {
  enabled: boolean;
  location: Coordinates | null;
  accuracyMeters: number | null;
  pingIntervalMs?: number;
  status?: string;
};

const DEFAULT_PING_MS = 15000;

export const useLiveLocationPing = ({
  enabled,
  location,
  accuracyMeters,
  pingIntervalMs = DEFAULT_PING_MS,
  status = 'Check IN',
}: UseLiveLocationPingOptions) => {
  const pingDelayRef = useRef(pingIntervalMs);
  const isPostingRef = useRef(false);
  const locationRef = useRef(location);
  const accuracyRef = useRef(accuracyMeters);
  const statusRef = useRef(status);

  locationRef.current = location;
  accuracyRef.current = accuracyMeters;
  statusRef.current = status;

  useEffect(() => {
    pingDelayRef.current = pingIntervalMs;
  }, [pingIntervalMs]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const scheduleNext = () => {
      if (!isMounted) {
        return;
      }

      timeoutId = setTimeout(() => {
        sendLiveLocation();
      }, pingDelayRef.current);
    };

    const sendLiveLocation = async () => {
      if (!isMounted) {
        return;
      }

      const currentLocation = locationRef.current;
      if (!currentLocation) {
        scheduleNext();
        return;
      }

      if (isPostingRef.current) {
        scheduleNext();
        return;
      }

      isPostingRef.current = true;

      try {
        const response = await postLiveLocation({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          status: statusRef.current,
        });

        const nextPingMs =
          response.tracking?.recommendedPingMs ??
          (response.tracking?.pingIntervalSeconds
            ? response.tracking.pingIntervalSeconds * 1000
            : pingDelayRef.current);

        pingDelayRef.current = nextPingMs;
      } catch (error) {
        console.warn(
          'Failed to send live location:',
          error instanceof Error ? error.message : error,
        );
      } finally {
        isPostingRef.current = false;
        scheduleNext();
      }
    };

    sendLiveLocation();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, pingIntervalMs]);
};
