// =============================================================================
// XENOCARE EMR - Staff Profile Page
// Allows staff members to view and manage their own profile
// =============================================================================

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Camera,
  Upload,
  Trash2,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Shield,
  ArrowLeft,
  Save,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { supabase } from '../api/supabaseClient';
import { useToast } from '../components/ui/Toast';
import { GuidanceSettings } from '../components/guidance/GuidanceSettings';

export default function Profile() {
  const { staff } = useAuth();
  const { isNightMode } = useTimeTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(
    staff?.photo_url || null,
  );
  const [isUploading, setIsUploading] = useState(false);

  // Theme configuration
  const theme = {
    bg: isNightMode
      ? 'bg-slate-950'
      : 'bg-gradient-to-br from-slate-50 via-white to-slate-100',
    cardBg: isNightMode ? 'bg-slate-900' : 'bg-white',
    cardBgAlt: isNightMode ? 'bg-slate-800/50' : 'bg-slate-50',
    text: isNightMode ? 'text-white' : 'text-slate-900',
    textMuted: isNightMode ? 'text-slate-400' : 'text-slate-600',
    textSubtle: isNightMode ? 'text-slate-500' : 'text-slate-400',
    border: isNightMode ? 'border-slate-800' : 'border-slate-200',
    shadow: isNightMode ? '' : 'shadow-lg shadow-slate-200/50',
  };

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoBase64: string) => {
      if (!staff?.id) throw new Error('No staff ID');
      const { error } = await supabase
        .from('staff')
        .update({ photo_url: photoBase64 })
        .eq('id', staff.id);

      if (error) throw error;
    },
    onSuccess: () => {
      showToast({
        message: 'Profile photo updated successfully',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['online-doctors'] });
    },
    onError: () => {
      showToast({ message: 'Failed to update profile photo', type: 'error' });
    },
  });

  // Remove photo mutation
  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id) throw new Error('No staff ID');
      const { error } = await supabase
        .from('staff')
        .update({ photo_url: null })
        .eq('id', staff.id);

      if (error) throw error;
    },
    onSuccess: () => {
      setPhotoPreview(null);
      showToast({ message: 'Profile photo removed', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['online-doctors'] });
    },
    onError: () => {
      showToast({ message: 'Failed to remove profile photo', type: 'error' });
    },
  });

  // Handle photo upload
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast({ message: 'Please select an image file', type: 'error' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast({
          message: 'Image size should be less than 5MB',
          type: 'error',
        });
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setPhotoPreview(base64);
        uploadPhotoMutation.mutate(base64, {
          onSettled: () => setIsUploading(false),
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    if (window.confirm('Are you sure you want to remove your profile photo?')) {
      removePhotoMutation.mutate();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!staff) {
    return (
      <div
        className={`min-h-screen ${theme.bg} flex items-center justify-center`}
      >
        <p className={theme.textMuted}>Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* Header */}
      <header className={`${theme.cardBg} border-b ${theme.border} px-6 py-4`}>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-xl ${theme.cardBgAlt} hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${theme.text}`}>My Profile</h1>
            <p className={`text-sm ${theme.textMuted}`}>
              Manage your account settings and profile information
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Photo Card */}
        <div className={`${theme.cardBg} rounded-xl ${theme.shadow} p-8`}>
          <h2 className={`text-lg font-bold ${theme.text} mb-6`}>
            Profile Photo
          </h2>

          <div className="flex items-start gap-8">
            {/* Photo Preview */}
            <div className="relative group">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl border-4 border-white">
                  <span className="text-4xl font-bold">
                    {staff.first_name?.[0]}
                    {staff.last_name?.[0]}
                  </span>
                </div>
              )}

              {/* Overlay on hover */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-wait"
              >
                {isUploading ? (
                  <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-10 h-10 text-white" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            {/* Photo Actions */}
            <div className="flex-1">
              <h3 className={`font-semibold ${theme.text} mb-2`}>
                {staff.first_name} {staff.last_name}
              </h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>
                Upload a clear photo of yourself for easy identification by
                colleagues and patients.
                <br />
                <span className={theme.textSubtle}>
                  Maximum file size: 5MB. Supported formats: JPG, PNG
                </span>
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading
                    ? 'Uploading...'
                    : photoPreview
                      ? 'Change Photo'
                      : 'Upload Photo'}
                </button>

                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={removePhotoMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Card */}
        <div className={`${theme.cardBg} rounded-xl ${theme.shadow} p-8`}>
          <h2 className={`text-lg font-bold ${theme.text} mb-6`}>
            Profile Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Staff ID */}
            <div className={`p-4 rounded-xl ${theme.cardBgAlt}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className={`text-sm font-medium ${theme.textMuted}`}>
                  Staff ID
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.text} font-mono`}>
                {staff.staff_id}
              </p>
            </div>

            {/* Role */}
            <div className={`p-4 rounded-xl ${theme.cardBgAlt}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className={`text-sm font-medium ${theme.textMuted}`}>
                  Role
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.text}`}>
                {formatRole(staff.role)}
              </p>
            </div>

            {/* Email */}
            <div className={`p-4 rounded-xl ${theme.cardBgAlt}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className={`text-sm font-medium ${theme.textMuted}`}>
                  Email
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.text}`}>{staff.email}</p>
            </div>

            {/* Phone */}
            <div className={`p-4 rounded-xl ${theme.cardBgAlt}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className={`text-sm font-medium ${theme.textMuted}`}>
                  Phone
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.text}`}>
                {staff.phone || 'Not provided'}
              </p>
            </div>

            {/* Department */}
            <div className={`p-4 rounded-xl ${theme.cardBgAlt}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className={`text-sm font-medium ${theme.textMuted}`}>
                  Department
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.text}`}>
                {staff.department || 'Not assigned'}
              </p>
            </div>

            {/* Account Created */}
            <div className={`p-4 rounded-xl ${theme.cardBgAlt}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className={`text-sm font-medium ${theme.textMuted}`}>
                  Member Since
                </span>
              </div>
              <p className={`text-lg font-bold ${theme.text}`}>
                {staff.created_at
                  ? new Date(staff.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Application Settings Section */}
        <div
          className={`mt-8 ${theme.cardBg} rounded-xl p-6 ${theme.shadow} border ${theme.border}`}
        >
          <h3 className={`text-lg font-bold ${theme.text} mb-6`}>
            Application Settings
          </h3>
          <GuidanceSettings />
        </div>

        {/* Help Text */}
        <div className="text-center py-4">
          <p className={`text-sm ${theme.textMuted}`}>
            To update other profile information, please contact your
            administrator or visit the Staff Management module.
          </p>
        </div>
      </main>
    </div>
  );
}
