'use client';

import { useState, useEffect } from 'react';
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
import { organizationsService } from '@/lib/services/organizations';
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

interface Organization {
  id: number;
  name: string;
}

export function CreateGeofenceModal({ isOpen, onClose, onRefresh }: CreateGeofenceModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization: '',
    // Four corner points for the polygon
    point1Lat: '',
    point1Lng: '',
    point2Lat: '',
    point2Lng: '',
    point3Lat: '',
    point3Lng: '',
    point4Lat: '',
    point4Lng: '',
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch organizations when modal opens
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!isOpen) return;
      try {
        setIsLoading(true);
        const orgs = await organizationsService.getAll();
        setOrganizations(orgs);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        toast.error('Failed to load organizations');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

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

    if (!formData.organization) {
      newErrors.organization = 'Please select an organization';
    }

    // Validate all four points
    const points = [
      { lat: formData.point1Lat, lng: formData.point1Lng, num: 1 },
      { lat: formData.point2Lat, lng: formData.point2Lng, num: 2 },
      { lat: formData.point3Lat, lng: formData.point3Lng, num: 3 },
      { lat: formData.point4Lat, lng: formData.point4Lng, num: 4 },
    ];

    points.forEach((point) => {
      if (!point.lat) {
        newErrors[`point${point.num}Lat`] = `Point ${point.num} latitude is required`;
      } else if (isNaN(Number(point.lat))) {
        newErrors[`point${point.num}Lat`] = `Point ${point.num} latitude is invalid`;
      }
      
      if (!point.lng) {
        newErrors[`point${point.num}Lng`] = `Point ${point.num} longitude is required`;
      } else if (isNaN(Number(point.lng))) {
        newErrors[`point${point.num}Lng`] = `Point ${point.num} longitude is invalid`;
      }
    });

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
      // Create polygon from four corner points
      const coordinates = [[
        [parseFloat(formData.point1Lng), parseFloat(formData.point1Lat)], // Point 1: [lng, lat]
        [parseFloat(formData.point2Lng), parseFloat(formData.point2Lat)], // Point 2
        [parseFloat(formData.point3Lng), parseFloat(formData.point3Lat)], // Point 3
        [parseFloat(formData.point4Lng), parseFloat(formData.point4Lat)], // Point 4
        [parseFloat(formData.point1Lng), parseFloat(formData.point1Lat)], // Close the polygon by returning to first point
      ]];
      
      const polygonJson = {
        type: 'Polygon',
        coordinates: coordinates
      };

      await geofencesService.create({
        name: formData.name,
        description: formData.description || undefined,
        polygon_json: polygonJson,
        organization: parseInt(formData.organization),
        active: true,
      });

      toast.success('Geofence created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        organization: '',
        point1Lat: '',
        point1Lng: '',
        point2Lat: '',
        point2Lng: '',
        point3Lat: '',
        point3Lng: '',
        point4Lat: '',
        point4Lng: '',
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
      organization: '',
      point1Lat: '',
      point1Lng: '',
      point2Lat: '',
      point2Lng: '',
      point3Lat: '',
      point3Lng: '',
      point4Lat: '',
      point4Lng: '',
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

          {/* Organization */}
          <div className="space-y-2">
            <Label htmlFor="organization" className="text-sm font-medium">
              Organization <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg z-10">
                business
              </span>
              <Select value={formData.organization} onValueChange={(value) => handleChange('organization', value)}>
                <SelectTrigger className={`pl-10 ${errors.organization ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.organization && <p className="text-xs text-red-500 mt-1">{errors.organization}</p>}
          </div>

          {/* Four Corner Points */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Define Four Corner Points</h3>
            
            {/* Point 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 1 Latitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    my_location
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., 40.7128"
                    value={formData.point1Lat}
                    onChange={(e) => handleChange('point1Lat', e.target.value)}
                    className={`pl-10 ${errors.point1Lat ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point1Lat && <p className="text-xs text-red-500 mt-1">{errors.point1Lat}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 1 Longitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    location_on
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., -74.0060"
                    value={formData.point1Lng}
                    onChange={(e) => handleChange('point1Lng', e.target.value)}
                    className={`pl-10 ${errors.point1Lng ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point1Lng && <p className="text-xs text-red-500 mt-1">{errors.point1Lng}</p>}
              </div>
            </div>

            {/* Point 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 2 Latitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    my_location
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., 40.7200"
                    value={formData.point2Lat}
                    onChange={(e) => handleChange('point2Lat', e.target.value)}
                    className={`pl-10 ${errors.point2Lat ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point2Lat && <p className="text-xs text-red-500 mt-1">{errors.point2Lat}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 2 Longitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    location_on
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., -74.0100"
                    value={formData.point2Lng}
                    onChange={(e) => handleChange('point2Lng', e.target.value)}
                    className={`pl-10 ${errors.point2Lng ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point2Lng && <p className="text-xs text-red-500 mt-1">{errors.point2Lng}</p>}
              </div>
            </div>

            {/* Point 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 3 Latitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    my_location
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., 40.7150"
                    value={formData.point3Lat}
                    onChange={(e) => handleChange('point3Lat', e.target.value)}
                    className={`pl-10 ${errors.point3Lat ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point3Lat && <p className="text-xs text-red-500 mt-1">{errors.point3Lat}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 3 Longitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    location_on
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., -74.0050"
                    value={formData.point3Lng}
                    onChange={(e) => handleChange('point3Lng', e.target.value)}
                    className={`pl-10 ${errors.point3Lng ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point3Lng && <p className="text-xs text-red-500 mt-1">{errors.point3Lng}</p>}
              </div>
            </div>

            {/* Point 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 4 Latitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    my_location
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., 40.7180"
                    value={formData.point4Lat}
                    onChange={(e) => handleChange('point4Lat', e.target.value)}
                    className={`pl-10 ${errors.point4Lat ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point4Lat && <p className="text-xs text-red-500 mt-1">{errors.point4Lat}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Point 4 Longitude <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    location_on
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., -74.0080"
                    value={formData.point4Lng}
                    onChange={(e) => handleChange('point4Lng', e.target.value)}
                    className={`pl-10 ${errors.point4Lng ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.point4Lng && <p className="text-xs text-red-500 mt-1">{errors.point4Lng}</p>}
              </div>
            </div>
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




