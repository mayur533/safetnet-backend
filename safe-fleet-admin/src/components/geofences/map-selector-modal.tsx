'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MapPoint {
  lat: number;
  lng: number;
}

interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (points: MapPoint[]) => void;
}

export function MapSelectorModal({
  isOpen,
  onClose,
  onConfirm,
}: MapSelectorModalProps) {
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (isOpen && !mapInstanceRef.current && mapRef.current) {
      initializeMap();
    }
    
    if (!isOpen) {
      clearAllPoints();
    }
  }, [isOpen]);

  const initializeMap = () => {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 28.6139, lng: 77.2090 }, // Delhi coordinates
      zoom: 12,
    });

    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        addPoint(lat, lng);
      }
    });

    mapInstanceRef.current = map;
  };

  const addPoint = (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    const newPoint: MapPoint = { lat, lng };
    const updatedPoints = [...mapPoints, newPoint];
    setMapPoints(updatedPoints);

    // Add marker
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: `Point ${updatedPoints.length}`,
    });

    markersRef.current.push(marker);

    // Update polygon if we have at least 3 points
    if (updatedPoints.length >= 3) {
      updatePolygon(updatedPoints);
    }
  };

  const updatePolygon = (points: MapPoint[]) => {
    if (!mapInstanceRef.current) return;

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }

    const polygon = new google.maps.Polygon({
      paths: points,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: mapInstanceRef.current,
    });

    polygonRef.current = polygon;
  };

  const removeLastPoint = () => {
    if (mapPoints.length === 0) return;

    const updatedPoints = mapPoints.slice(0, -1);
    setMapPoints(updatedPoints);

    // Remove last marker
    if (markersRef.current.length > 0) {
      const lastMarker = markersRef.current.pop();
      lastMarker?.setMap(null);
    }

    // Update polygon
    if (updatedPoints.length >= 3) {
      updatePolygon(updatedPoints);
    } else if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
  };

  const clearAllPoints = () => {
    setMapPoints([]);
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
  };

  const handleConfirm = () => {
    if (mapPoints.length < 3) {
      toast.error('At least 3 points are required to create a geofence');
      return;
    }
    onConfirm(mapPoints);
    onClose();
  };

  const handleClose = () => {
    clearAllPoints();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Geofence Area</DialogTitle>
          <DialogDescription>
            Click on the map to add points. At least 3 points are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeLastPoint}
                disabled={mapPoints.length === 0}
              >
                <span className="material-icons text-sm mr-2">undo</span>
                Remove Last
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllPoints}
                disabled={mapPoints.length === 0}
              >
                <span className="material-icons text-sm mr-2">clear_all</span>
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Points added: <strong>{mapPoints.length}</strong>
            </div>
          </div>

          {/* Map */}
          <div className="border rounded-lg overflow-hidden" style={{ height: '450px' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="material-icons text-blue-600 text-xl">info</span>
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium">Instructions:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Click on the map to add points for your geofence</li>
                  <li>At least 3 points are required to create a polygon</li>
                  <li>You can remove the last point or clear all points and start over</li>
                  <li>Click "Confirm" when you're done selecting points</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={mapPoints.length < 3}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Confirm ({mapPoints.length} points)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

