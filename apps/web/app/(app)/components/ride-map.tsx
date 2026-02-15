"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { decode } from "@googlemaps/polyline-codec";

interface RideMapProps {
  /** Encoded polyline string from Google Routes API */
  encodedPolyline: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

/**
 * Map component that displays a route polyline between origin and destination.
 * Decodes the Google Routes API encoded polyline and draws it on a Google Map.
 * Auto-fits bounds to show the entire route.
 */
export function RideMap({
  encodedPolyline,
  originLat,
  originLng,
  destLat,
  destLng,
}: RideMapProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const originMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!map || !encodedPolyline) return;

    // Clean up previous polyline and markers
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    if (originMarkerRef.current) {
      originMarkerRef.current.map = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.map = null;
    }

    // Decode polyline to array of [lat, lng]
    const decodedPath = decode(encodedPolyline);
    const path = decodedPath.map(
      ([lat, lng]) => new google.maps.LatLng(lat, lng),
    );

    // Draw polyline
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#6C63FF",
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map,
    });
    polylineRef.current = polyline;

    // Add origin marker (green dot)
    const originPin = document.createElement("div");
    originPin.style.width = "14px";
    originPin.style.height = "14px";
    originPin.style.borderRadius = "50%";
    originPin.style.backgroundColor = "#22c55e";
    originPin.style.border = "2px solid white";
    originPin.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

    const originMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: originLat, lng: originLng },
      content: originPin,
      title: "Origin",
    });
    originMarkerRef.current = originMarker;

    // Add destination marker (red dot)
    const destPin = document.createElement("div");
    destPin.style.width = "14px";
    destPin.style.height = "14px";
    destPin.style.borderRadius = "50%";
    destPin.style.backgroundColor = "#ef4444";
    destPin.style.border = "2px solid white";
    destPin.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

    const destMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: destLat, lng: destLng },
      content: destPin,
      title: "Destination",
    });
    destMarkerRef.current = destMarker;

    // Fit bounds to show entire route
    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    bounds.extend({ lat: originLat, lng: originLng });
    bounds.extend({ lat: destLat, lng: destLng });
    map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });

    return () => {
      polyline.setMap(null);
      originMarker.map = null;
      destMarker.map = null;
    };
  }, [map, encodedPolyline, originLat, originLng, destLat, destLng]);

  // Center on Czech Republic as default
  const defaultCenter = {
    lat: (originLat + destLat) / 2,
    lng: (originLng + destLng) / 2,
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border-pastel shadow-sm">
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={8}
        mapId="ride-route-map"
        style={{ width: "100%", height: "300px" }}
        disableDefaultUI={true}
        zoomControl={true}
      />
    </div>
  );
}
