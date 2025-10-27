'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { geofencesService } from '@/lib/services/geofences';
import { toast } from 'sonner';

interface CreateGeofenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const zoneTypes = [
  'Residential',
  'Commercial',
  'Industrial',
  'Educational',
  'Healthcare',
  'Entertainment',
  'Government',
  'Mixed Use',
];

const colors = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
];

export function CreateGeofenceModal({ isOpen, onClose, onRefresh }: CreateGeofenceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zoneType: '',
    color: '#6366f1',
    latitude: '',
    longitude: '',
    radius: '500',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Geofence name is required';
    }

    if (!formData.zoneType) {
      newErrors.zoneType = 'Please select a zone type';
    }

    if (!formData.latitude) {
      newErrors.latitude = 'Latitude is required';
    } else if (isNaN(Number(formData.latitude))) {
      newErrors.latitude = 'Invalid latitude format';
    }

    if (!formData.longitude) {
      newErrors.longitude = 'Longitude is required';
    } else if (isNaN(Number(formData.longitude))) {
      newErrors.longitude = 'Invalid longitude format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      const radiusMeters = parseInt(formData.radius);
      
      // Create a circular polygon from center point and radius
      // Convert radius from meters to degrees (approximate)
      const radiusDeg = radiusMeters / 111320; // 1 degree ≈ 111.32 km
      const numPoints = 32; // Number of points to create the circle
      
      const coordinates: number[][][] = [[]];
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const pointLng = lng + radiusDeg * Math.cos(angle) / Math.cos(lat * Math.PI / 180);
        const pointLat = lat + radiusDeg * Math.sin(angle);
        coordinates[0].push([pointLng, pointLat]); // GeoJSON uses [lng, lat]
      }
      
      const polygonJson = {
        type: 'Polygon',
        coordinates: coordinates
      };

      await geofencesService.create({
        name: formData.name,
        description: formData.description || undefined,
        zone_type: formData.zoneType,
        polygon_json: polygonJson,
        center_point: [lat, lng], // Our API uses [lat, lng]
        is_active: true,
      });

      toast.success('Geofence created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        zoneType: '',
        color: '#6366f1',
        latitude: '',
        longitude: '',
        radius: '500',
      });
      
      onClose();
      
      // Refresh geofences list
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Create geofence error:', error);
      toast.error(error.message || 'Failed to create geofence');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      zoneType: '',
      color: '#6366f1',
      latitude: '',
      longitude: '',
      radius: '500',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center">
            <span className="material-icons text-indigo-600 mr-2">add_location</span>
            Create New Geofence
          </DialogTitle>
          <DialogDescription>
            Define a new security zone with custom boundaries and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Geofence Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Geofence Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                label
              </span>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Downtown Security Zone"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-3 text-muted-foreground text-lg">
                description
              </span>
              <textarea
                id="description"
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full pl-10 pr-4 py-2 min-h-[80px] rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Zone Type and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zoneType" className="text-sm font-medium">
                Zone Type <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg z-10">
                  category
                </span>
                <Select value={formData.zoneType} onValueChange={(value) => handleChange('zoneType', value)}>
                  <SelectTrigger className={`pl-10 ${errors.zoneType ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.zoneType && <p className="text-xs text-red-500 mt-1">{errors.zoneType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color" className="text-sm font-medium">
                Border Color
              </Label>
              <Select value={formData.color} onValueChange={(value) => handleChange('color', value)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      ></div>
                      {colors.find((c) => c.value === formData.color)?.name || 'Select color'}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        ></div>
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-sm font-medium">
                Latitude <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  my_location
                </span>
                <Input
                  id="latitude"
                  type="text"
                  placeholder="e.g., 40.7128"
                  value={formData.latitude}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  className={`pl-10 ${errors.latitude ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.latitude && <p className="text-xs text-red-500 mt-1">{errors.latitude}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-sm font-medium">
                Longitude <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  location_on
                </span>
                <Input
                  id="longitude"
                  type="text"
                  placeholder="e.g., -74.0060"
                  value={formData.longitude}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  className={`pl-10 ${errors.longitude ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.longitude && <p className="text-xs text-red-500 mt-1">{errors.longitude}</p>}
            </div>
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <Label htmlFor="radius" className="text-sm font-medium">
              Radius (meters)
            </Label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                adjust
              </span>
              <Input
                id="radius"
                type="number"
                min="100"
                max="10000"
                step="50"
                value={formData.radius}
                onChange={(e) => handleChange('radius', e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Current radius: {formData.radius}m
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="material-icons text-indigo-600 text-xl">info</span>
              <div className="flex-1">
                <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium">
                  Drawing Tip
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                  After creation, you can refine the geofence shape by clicking on the map to add polygon points.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
            >
              {isSubmitting ? (
                <>
                  <span className="material-icons animate-spin text-sm mr-2">refresh</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-icons text-sm mr-2">add_location</span>
                  Create Geofence
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}




