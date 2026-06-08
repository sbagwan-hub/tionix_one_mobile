import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useOfficeDistance } from '../hooks/useOfficeDistance';
import { useLiveLocationPing } from '../hooks/useLiveLocationPing';
import { getAuthSession } from '../services/auth';
import { getLiveLocationConfig } from '../services/attendance';
import { COMPANY } from '../config/company';

const DEFAULT_PING_MS = 15000;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LiveLocationContextValue = {
  employeeLocation: Coordinates | null;
  accuracyMeters: number | null;
  distanceMeters: number | null;
  isWithinRange: boolean;
  locationError: string | null;
  isTracking: boolean;
  setOfficeLocation: (office: Coordinates | null) => void;
  status: string;
  setStatus: (status: string) => void;
};

const LiveLocationContext = createContext<LiveLocationContextValue | null>(null);

export const LiveLocationProvider = ({ children }: { children: ReactNode }) => {
  const [officeLocation, setOfficeLocation] = useState<Coordinates | null>({
    latitude: COMPANY.office.latitude,
    longitude: COMPANY.office.longitude,
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pingIntervalMs, setPingIntervalMs] = useState(DEFAULT_PING_MS);
  const [status, setStatusState] = useState<string>('Check OUT');

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const session = await getAuthSession();
      if (isMounted) {
        setIsLoggedIn(Boolean(session?.token));
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isMounted = true;

    const loadTrackingConfig = async () => {
      try {
        const response = await getLiveLocationConfig();
        if (!isMounted || !response.success) {
          return;
        }

        const nextPingMs =
          response.tracking?.recommendedPingMs ??
          (response.tracking?.pingIntervalSeconds
            ? response.tracking.pingIntervalSeconds * 1000
            : DEFAULT_PING_MS);

        setPingIntervalMs(nextPingMs);
      } catch (error) {
        console.warn(
          'Failed to load live location config:',
          error instanceof Error ? error.message : error,
        );
      }
    };

    loadTrackingConfig();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const {
    employeeLocation,
    accuracyMeters,
    distanceMeters,
    isWithinRange,
    locationError,
    isTracking,
  } = useOfficeDistance(officeLocation);

  useLiveLocationPing({
    enabled: isLoggedIn && isTracking && employeeLocation !== null,
    location: employeeLocation,
    accuracyMeters,
    pingIntervalMs,
    status,
  });

  const setStatus = (newStatus: string) => {
    setStatusState(newStatus);
  };

  const value = useMemo(
    () => ({
      employeeLocation,
      accuracyMeters,
      distanceMeters,
      isWithinRange,
      locationError,
      isTracking,
      setOfficeLocation,
      status,
      setStatus,
    }),
    [
      employeeLocation,
      accuracyMeters,
      distanceMeters,
      isWithinRange,
      locationError,
      isTracking,
      status,
    ],
  );

  return (
    <LiveLocationContext.Provider value={value}>{children}</LiveLocationContext.Provider>
  );
};

export const useLiveLocation = (): LiveLocationContextValue => {
  const context = useContext(LiveLocationContext);

  if (!context) {
    throw new Error('useLiveLocation must be used within LiveLocationProvider');
  }

  return context;
};
