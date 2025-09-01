import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Configure axios
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/user-info');
      setUser(response.data);
      setError(null);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/login');
      const { authorization_url } = response.data;
      
      // Redirect to Google authorization
      window.location.href = authorization_url;
    } catch (error) {
      setError('Authentication failed');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Loading Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Login Component
const Login = () => {
  const { login, loading, error } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Trade Union MIS</h1>
          <p className="text-gray-600">Management Information System</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Sign in to access member management and renewal tracking</p>
        </div>
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">
              Trade Union MIS
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
              Dashboard
            </Link>
            <Link to="/members" className="text-gray-700 hover:text-blue-600 font-medium">
              Members
            </Link>
            <Link to="/renewals" className="text-gray-700 hover:text-blue-600 font-medium">
              Renewals
            </Link>
            <Link to="/import" className="text-gray-700 hover:text-blue-600 font-medium">
              Import
            </Link>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
              <button
                onClick={logout}
                className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 hover:text-gray-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 border-t">
              <Link
                to="/dashboard"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/members"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Members
              </Link>
              <Link
                to="/renewals"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Renewals
              </Link>
              <Link
                to="/import"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Import
              </Link>
              <div className="border-t pt-2">
                <div className="px-3 py-2 text-sm text-gray-600">{user?.name || user?.email}</div>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dashboard/stats');
      setStats(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of trade union member management</p>
        </div>
        
        {/* Key Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_members || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.active_members || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Renewals</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.renewals_pending || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{(stats?.total_revenue || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Members by State */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Members by State</h3>
            <div className="space-y-3">
              {Object.entries(stats?.members_by_state || {}).slice(0, 5).map(([state, count]) => (
                <div key={state} className="flex justify-between items-center">
                  <span className="text-gray-600">{state}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Members by Work Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Members by Work Type</h3>
            <div className="space-y-3">
              {Object.entries(stats?.members_by_work_type || {}).slice(0, 5).map(([workType, count]) => (
                <div key={workType} className="flex justify-between items-center">
                  <span className="text-gray-600 truncate">{workType}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Renewal Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Renewal Trends (Last 6 Months)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats?.renewal_trends?.map((trend, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-blue-600">{trend.count}</div>
                <div className="text-sm text-gray-500">{trend.month}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/members"
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg text-center font-semibold transition duration-200"
          >
            View All Members
          </Link>
          <Link
            to="/renewals"
            className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg text-center font-semibold transition duration-200"
          >
            Manage Renewals
          </Link>
          <Link
            to="/import"
            className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg text-center font-semibold transition duration-200"
          >
            Import Data
          </Link>
        </div>
      </div>
    </div>
  );
};

// Import Component
const ImportMembers = () => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [rangeName, setRangeName] = useState('Sheet1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async (e) => {
    e.preventDefault();
    
    if (!spreadsheetId.trim()) {
      setError('Please enter a spreadsheet ID');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await axios.post('/api/members/import', null, {
        params: {
          spreadsheet_id: spreadsheetId.trim(),
          range_name: rangeName.trim()
        }
      });

      setMessage(response.data.message);
      setSpreadsheetId('');
      setRangeName('Sheet1');
    } catch (error) {
      console.error('Import failed:', error);
      setError(error.response?.data?.detail || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Import Members</h1>
          <p className="text-gray-600">Import member data from Google Sheets</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleImport} className="space-y-6">
            <div>
              <label htmlFor="spreadsheet-id" className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheets ID
              </label>
              <input
                id="spreadsheet-id"
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="Enter the Google Sheets ID from URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Copy the ID from your Google Sheets URL: https://docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
              </p>
            </div>

            <div>
              <label htmlFor="range-name" className="block text-sm font-medium text-gray-700 mb-2">
                Sheet Range
              </label>
              <input
                id="range-name"
                type="text"
                value={rangeName}
                onChange={(e) => setRangeName(e.target.value)}
                placeholder="Sheet1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Specify the sheet name (e.g., "Sheet1", "Members", etc.)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                'Import Members'
              )}
            </button>
          </form>
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Expected Sheet Format:</h3>
            <p className="text-sm text-blue-700 mb-2">Your Google Sheet should have the following columns:</p>
            <div className="text-xs text-blue-600 space-y-1">
              <p>• Name of the Member, Trade Union Number, Age, Contact No.</p>
              <p>• Father/Husband Name, Caste, Addresses, Monthly Salary</p>
              <p>• Type of Work, Housing Situation, Children details</p>
              <p>• Employer information, Years in work, Hours worked</p>
              <p>• Aadhaar Number, Nominee details, State, Coordinator</p>
              <p>• And all other fields as mentioned in your original sheet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Members List Component
const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [search, selectedState]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedState) params.state = selectedState;
      
      const response = await axios.get('/api/members', { params });
      setMembers(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Members</h1>
          <p className="text-gray-600">Manage trade union members</p>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Members
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, union number, or contact"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by State
              </label>
              <select
                id="state"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All States</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Kerala">Kerala</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Members List */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {members.length} Members Found
              </h3>
            </div>
            
            {members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No members found. Try adjusting your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Union Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        State
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.member_name}</div>
                            <div className="text-sm text-gray-500">{member.type_of_work}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.trade_union_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.contact_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Renewals Component
const Renewals = () => {
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Form state
  const [newRenewal, setNewRenewal] = useState({
    trade_union_number: '',
    renewal_date: '',
    receipt_number: '',
    coordinator_name: '',
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/renewals');
      setRenewals(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch renewals:', error);
      setError('Failed to load renewals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const renewalData = {
        ...newRenewal,
        amount: newRenewal.amount ? parseFloat(newRenewal.amount) : null
      };
      
      await axios.post('/api/renewals', renewalData);
      
      setMessage('Renewal added successfully!');
      setNewRenewal({
        trade_union_number: '',
        renewal_date: '',
        receipt_number: '',
        coordinator_name: '',
        amount: '',
        notes: ''
      });
      
      fetchRenewals();
    } catch (error) {
      console.error('Failed to add renewal:', error);
      setError(error.response?.data?.detail || 'Failed to add renewal');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRenewal(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Renewals</h1>
          <p className="text-gray-600">Manage member renewals</p>
        </div>
        
        {/* Add New Renewal Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Renewal</h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trade_union_number" className="block text-sm font-medium text-gray-700 mb-2">
                Trade Union Number
              </label>
              <input
                id="trade_union_number"
                name="trade_union_number"
                type="text"
                value={newRenewal.trade_union_number}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="renewal_date" className="block text-sm font-medium text-gray-700 mb-2">
                Renewal Date
              </label>
              <input
                id="renewal_date"
                name="renewal_date"
                type="date"
                value={newRenewal.renewal_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="receipt_number" className="block text-sm font-medium text-gray-700 mb-2">
                Receipt Number
              </label>
              <input
                id="receipt_number"
                name="receipt_number"
                type="text"
                value={newRenewal.receipt_number}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="coordinator_name" className="block text-sm font-medium text-gray-700 mb-2">
                Coordinator Name
              </label>
              <input
                id="coordinator_name"
                name="coordinator_name"
                type="text"
                value={newRenewal.coordinator_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (Optional)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={newRenewal.amount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <input
                id="notes"
                name="notes"
                type="text"
                value={newRenewal.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Renewal'
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Renewals List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Renewals</h3>
          </div>
          
          {renewals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No renewals found. Add the first renewal above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Union Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renewal Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renewals.map((renewal) => (
                    <tr key={renewal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {renewal.trade_union_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(renewal.renewal_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renewal.receipt_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renewal.coordinator_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renewal.amount ? `₹${renewal.amount.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/renewals" element={<ProtectedRoute><Renewals /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute><ImportMembers /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;