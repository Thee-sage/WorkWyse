"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
import { updateUserType } from '../../components/AuthAPI';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, userType, setUserType, logout } = useAuth();
  const [selectedType, setSelectedType] = useState<'public' | 'private'>(userType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    setSelectedType(userType);
  }, [user, userType, router]);

  const handleUpdateType = async () => {
    if (!user?.uid) return;
    
    if (selectedType === userType) {
      setError('You are already a ' + userType + ' user.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateUserType(user.uid, selectedType);
      setUserType(selectedType);
      setSuccess('User type updated successfully! Please refresh the page to see changes.');
      // Update localStorage
      localStorage.setItem('userType', selectedType);
    } catch (err: any) {
      setError(err.message || 'Failed to update user type');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

          {/* User Info */}
          <div className="mb-8 pb-8 border-b">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">Username: </span>
                <span className="font-medium">{user.username}</span>
              </div>
              <div>
                <span className="text-gray-600">User ID: </span>
                <span className="font-mono text-sm">{user.uid}</span>
              </div>
              <div>
                <span className="text-gray-600">Current Type: </span>
                <span className={`font-medium px-2 py-1 rounded ${
                  userType === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {userType.charAt(0).toUpperCase() + userType.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* User Type Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Type</h2>
            <p className="text-gray-600 mb-4">
              Choose your account type. This affects what actions you can perform on the platform.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setSelectedType('public')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  selectedType === 'public'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Public User</h3>
                  {selectedType === 'public' && (
                    <span className="text-blue-500 text-xl">✓</span>
                  )}
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Can vote on jobs (upvote/downvote)</li>
                  <li>✓ Can add job listings</li>
                  <li>✓ Can add reviews</li>
                  <li>✓ Can see trust scores</li>
                </ul>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('private')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  selectedType === 'private'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Private User</h3>
                  {selectedType === 'private' && (
                    <span className="text-purple-500 text-xl">✓</span>
                  )}
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Can add reviews</li>
                  <li>✗ Cannot vote on jobs</li>
                  <li>✗ Cannot add job listings</li>
                  <li>✗ Limited visibility</li>
                </ul>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {success}
              </div>
            )}

            <button
              onClick={handleUpdateType}
              disabled={loading || selectedType === userType}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                loading || selectedType === userType
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Updating...' : 'Update Account Type'}
            </button>
          </div>

          {/* Logout */}
          <div className="pt-6 border-t">
            <button
              onClick={logout}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

