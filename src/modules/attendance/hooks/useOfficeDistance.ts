import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const useOfficeDistance = (officeLocation: Coordinates | null) => {
  const [employeeLocation, setEmployeeLocation] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      const hasPermission = await requestLocationPermission();

      if (!isMounted) {
        return;
      }

      if (!hasPermission) {
        setLocationError('Location permission is required to mark attendance.');
        setIsTracking(false);
        return;
      }

      setLocationError(null);
      setIsTracking(true);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        position => {
          if (!isMounted) {
            return;
          }

          const currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const distance = officeLocation
            ? getDistance(currentLocation, officeLocation, 1) // Use 1m accuracy for distance calculation
            : null;

          setEmployeeLocation(currentLocation);
          setAccuracyMeters(position.coords.accuracy ?? null);
          setDistanceMeters(distance);
          setLocationError(null);
        }
      );
    };

    startTracking().catch(() => {
      if (!isMounted) {
        return;
      }

      setLocationError('Unable to start live location tracking.');
      setIsTracking(false);
    });

    return () => {
      isMounted = false;

      if (subscription) {
        subscription.remove();
      }
    };
  }, [officeLocation]);

  const isWithinRange =
    distanceMeters !== null; // Always allow punching from current location

  return {
    employeeLocation,
    accuracyMeters,
    distanceMeters,
    isWithinRange,
    locationError,
    isTracking,
  };
};

export const showLocationAlert = (message: string) => {
  Alert.alert('Location required', message);
};
