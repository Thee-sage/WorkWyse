'use client';

import { useState, useEffect } from 'react';
import JobList from '../components/JobList';
import AddJobForm from '../components/AddJobForm';
import { Job } from '../types/job';
import AuthContextExample from '../components/AuthContextExample';
import { useAuth } from '../components/AuthContext';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { userType, setUserType } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/jobs');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobAdded = (newJob: Job) => {
    setJobs([newJob, ...jobs]);
    setShowAddForm(false);
  };

  const handleVote = async (jobId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const userId = `user_${Math.random().toString(36).substr(2, 9)}`; // Simple user ID for demo
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, voteType }),
      });

      if (response.ok) {
        // Refresh jobs to get updated vote counts
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading jobs...</div>
      </div>
    );
  }

  return (
    <main>
      <AuthContextExample />
      <div className="min-h-screen bg-gray-50">
        {/* User Type Toggle */}
        <div className="flex justify-center py-4">
          <button
            className={`px-4 py-2 rounded-l-lg border ${userType === 'public' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setUserType('public')}
            disabled={userType === 'public'}
          >
            Public User
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg border-t border-b border-r ${userType === 'private' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setUserType('private')}
            disabled={userType === 'private'}
          >
            Private User
          </button>
        </div>
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">JobReview</h1>
                <p className="text-gray-600">Find real jobs, avoid fake ones</p>
              </div>
              {/* Only public users can add jobs */}
              {userType === 'public' && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {showAddForm ? 'Cancel' : 'Add Job'}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Add Job Form - only for public users */}
          {showAddForm && userType === 'public' && (
            <div className="mb-8">
              <AddJobForm onJobAdded={handleJobAdded} />
            </div>
          )}

          {/* Job List */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Recent Job Listings ({jobs.length})
            </h2>
            <JobList jobs={jobs} onVote={handleVote} userType={userType} />
          </div>
        </div>
      </div>
    </main>
  );
}
