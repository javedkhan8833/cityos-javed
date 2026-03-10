import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { Landmark } from "@/lib/wikipedia";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet marker icons in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapControllerProps {
  onBoundsChange: (lat: number, lon: number, radius: number) => void;
}

function MapController({ onBoundsChange }: MapControllerProps) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      // Calculate a rough radius based on bounds (distance from center to corner)
      const bounds = map.getBounds();
      const corner = bounds.getNorthEast();
      const radius = center.distanceTo(corner);
      
      onBoundsChange(center.lat, center.lng, Math.min(Math.round(radius), 10000)); // Cap radius at 10km for API performance
    },
  });
  return null;
}

interface MapProps {
  landmarks: Landmark[];
  onSelectLandmark: (landmark: Landmark) => void;
  selectedLandmark: Landmark | null;
  onBoundsChange: (lat: number, lon: number, radius: number) => void;
}

export default function Map({ landmarks, onSelectLandmark, selectedLandmark, onBoundsChange }: MapProps) {
  // Default center: London (can be geolocation later)
  const defaultCenter = [51.505, -0.09] as [number, number];

  // Try to get user location on mount
  const [position, setPosition] = useState<[number, number]>(defaultCenter);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          // Initial fetch for user location
          onBoundsChange(latitude, longitude, 5000); 
        },
        () => {
           // Fallback or permission denied - trigger initial fetch for default center
           onBoundsChange(defaultCenter[0], defaultCenter[1], 5000);
        }
      );
    } else {
        onBoundsChange(defaultCenter[0], defaultCenter[1], 5000);
    }
  }, []); // Run once on mount

  // Custom SVG Icon for markers
  const createIcon = (isSelected: boolean) => new L.DivIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="
        background-color: ${isSelected ? 'hsl(240 5.9% 10%)' : 'white'};
        border: 2px solid hsl(240 5.9% 10%);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        transition: all 0.2s ease;
        transform: scale(${isSelected ? 1.2 : 1});
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? 'white' : 'currentColor'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15], // Center the icon
  });

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      scrollWheelZoom={true} 
      className="w-full h-full z-0"
      zoomControl={false} // We'll add custom controls if needed or use default placement
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapController onBoundsChange={onBoundsChange} />

      {landmarks.map((landmark) => (
        <Marker
          key={landmark.pageid}
          position={[landmark.lat, landmark.lon]}
          icon={createIcon(selectedLandmark?.pageid === landmark.pageid)}
          eventHandlers={{
            click: () => onSelectLandmark(landmark),
          }}
        />
      ))}
      
      {/* Helper component to fly to user location if position changes programmatically? Not needed for MVP */}
    </MapContainer>
  );
}
