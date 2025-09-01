import React, { useState } from 'react';
import axios from 'axios';

const ExportComponent = () => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [rangeName, setRangeName] = useState('Renewals!A:D');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async (e) => {
    e.preventDefault();
    
    if (!spreadsheetId.trim()) {
      setError('Please enter a spreadsheet ID');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await axios.post('/api/renewals/export', null, {
        params: {
          spreadsheet_id: spreadsheetId.trim(),
          range_name: rangeName.trim()
        }
      });

      setMessage(response.data.message);
      setSpreadsheetId('');
      setRangeName('Renewals!A:D');
    } catch (error) {
      console.error('Export failed:', error);
      setError(error.response?.data?.detail || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Renewal Data</h3>
      
      <form onSubmit={handleExport} className="space-y-6">
        <div>
          <label htmlFor="export-spreadsheet-id" className="block text-sm font-medium text-gray-700 mb-2">
            Google Sheets ID
          </label>
          <input
            id="export-spreadsheet-id"
            type="text"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="Enter the Google Sheets ID for export"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="export-range-name" className="block text-sm font-medium text-gray-700 mb-2">
            Sheet Range
          </label>
          <input
            id="export-range-name"
            type="text"
            value={rangeName}
            onChange={(e) => setRangeName(e.target.value)}
            placeholder="Renewals!A:D"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Specify the sheet name and range (e.g., "Renewals!A:D")
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
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Exporting...
            </>
          ) : (
            'Export to Google Sheets'
          )}
        </button>
      </form>
    </div>
  );
};

export default ExportComponent;