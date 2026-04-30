"use client";

export interface GlobeMarker {
  location: [number, number];
  size: number;
}

interface Props {
  markers: GlobeMarker[];
}

function markerPosition([lat, lng]: [number, number]) {
  return {
    left: `${((lng + 180) / 360) * 100}%`,
    top: `${((90 - lat) / 180) * 100}%`,
  };
}

export function TravelGlobe({ markers }: Props) {
  const markerViews = markers.slice(0, 36);

  return (
    <div className="earth-stage" aria-label="Planeta Tierra animado con países visitados">
      <div className="earth-orbit earth-orbit-one" />
      <div className="earth-orbit earth-orbit-two" />
      <div className="earth-orbit earth-orbit-three" />
      <div className="earth-glow" />
      <div className="earth-sphere">
        <div className="earth-map-strip">
          <div className="earth-map-copy">
            {markerViews.map((marker, index) => (
              <span
                key={`marker-a-${index}`}
                className="earth-marker"
                style={{
                  ...markerPosition(marker.location),
                  width: `${Math.max(marker.size * 180, 9)}px`,
                  height: `${Math.max(marker.size * 180, 9)}px`,
                  animationDelay: `${index * 110}ms`,
                }}
              />
            ))}
          </div>
          <div className="earth-map-copy" aria-hidden>
            {markerViews.map((marker, index) => (
              <span
                key={`marker-b-${index}`}
                className="earth-marker"
                style={{
                  ...markerPosition(marker.location),
                  width: `${Math.max(marker.size * 180, 9)}px`,
                  height: `${Math.max(marker.size * 180, 9)}px`,
                  animationDelay: `${index * 110}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
