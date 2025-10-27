'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { usersService, type User } from '@/lib/services/users';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUserId: number | null;
  onUserUpdated?: () => void;
}

export function AddUserModal({ isOpen, onClose, editingUserId, onUserUpdated }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const isEditing = !!editingUserId;

  useEffect(() => {
    if (isEditing && isOpen && editingUserId) {
      fetchUserData(editingUserId);
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        isActive: true,
      });
      setErrors({});
    }
  }, [isEditing, isOpen, editingUserId]);

  const fetchUserData = async (userId: number) => {
    try {
      setIsLoadingUser(true);
      const user = await usersService.getById(userId);
      setFormData({
        username: user.username,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        isActive: user.is_active,
      });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (formData.role !== 'Admin' && !formData.assignedGeofence) {
      newErrors.assignedGeofence = 'Please select a geofence';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && editingUserId) {
        // Update user via API
        await usersService.update(editingUserId, {
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          is_active: formData.isActive,
        });
        toast.success('User updated successfully');
      } else {
        // Create new user via registration API
        const nameParts = formData.firstName ? `${formData.firstName} ${formData.lastName}`.trim() : formData.username;
        await usersService.create({
          username: formData.username,
          email: formData.email,
          password: formData.password || 'Temporary123!', // Generate temporary password
          full_name: nameParts,
          role: 'USER',
        });
        toast.success('User created successfully');
      }
      
      onUserUpdated?.();
      onClose();
    } catch (error) {
      console.error('User operation error:', error);
      toast.error(isEditing ? 'Failed to update user' : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      email: '',
      role: '',
      password: '',
      confirmPassword: '',
      assignedGeofence: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            <span className="material-icons text-indigo-600 mr-2">
              {isEditing ? 'edit' : 'person_add'}
            </span>
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update user information and permissions' : 'Create a new user account with role and permissions'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                person
              </span>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className={`pl-10 ${errors.fullName ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Email and Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  email
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@safefleet.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                User Role <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg z-10">
                  admin_panel_settings
                </span>
                <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                  <SelectTrigger className={`pl-10 ${errors.role ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
            </div>
          </div>

          {/* Password Fields - Only show when creating new user */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    lock
                  </span>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    lock_outline
                  </span>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={`pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          )}

          {/* Assigned Geofence - Hide for Admin role */}
          {formData.role !== 'Admin' && (
            <div className="space-y-2">
              <Label htmlFor="assignedGeofence" className="text-sm font-medium">
                Assigned Geofence {formData.role && <span className="text-red-500">*</span>}
              </Label>
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg z-10">
                  location_on
                </span>
                <Select
                  value={formData.assignedGeofence}
                  onValueChange={(value) => handleChange('assignedGeofence', value)}
                >
                  <SelectTrigger className={`pl-10 ${errors.assignedGeofence ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select geofence" />
                  </SelectTrigger>
                  <SelectContent>
                    {geofences.map((geofence) => (
                      <SelectItem key={geofence} value={geofence}>
                        {geofence}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.assignedGeofence && (
                <p className="text-xs text-red-500 mt-1">{errors.assignedGeofence}</p>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="material-icons text-indigo-600 text-xl">info</span>
              <div className="flex-1">
                <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium">
                  Role-Based Access
                </p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                  {formData.role === 'Admin' && 'Admins have full system access and can manage all users.'}
                  {formData.role === 'Sub-Admin' && 'Sub-admins can manage their assigned geofence and create security logins.'}
                  {formData.role === 'Security' && 'Security officers can respond to alerts in their assigned area.'}
                  {formData.role === 'Resident' && 'Residents can trigger SOS alerts and join community groups.'}
                  {!formData.role && 'Select a role to see permission details.'}
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
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <span className="material-icons animate-spin text-sm mr-2">refresh</span>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <span className="material-icons text-sm mr-2">
                    {isEditing ? 'save' : 'check'}
                  </span>
                  {isEditing ? 'Update User' : 'Create User'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}



