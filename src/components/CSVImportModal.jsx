import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import { useCRM } from '../store/CRMContext';
import { importContactsFromCSV, downloadCSVTemplate } from '../services/csvService';

export default function CSVImportModal({ onClose }) {
  const { addContact, contacts } = useCRM();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');
    setResults(null);

    try {
      const importResult = await importContactsFromCSV(file, {
        skipDuplicates: true,
        updateExisting: false
      });

      // Check for existing contacts by email
      const existingEmails = new Set(contacts.map(c => c.email?.toLowerCase()));
      const newContacts = importResult.contacts.filter(c => 
        !existingEmails.has(c.email?.toLowerCase())
      );
      const duplicates = importResult.contacts.filter(c => 
        existingEmails.has(c.email?.toLowerCase())
      );

      // Import new contacts
      let imported = 0;
      let failed = 0;
      const errors = [];

      for (const contact of newContacts) {
        try {
          await addContact(contact);
          imported++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import ${contact.email}: ${err.message}`);
        }
      }

      setResults({
        total: importResult.total,
        imported,
        duplicates: duplicates.length,
        skipped: importResult.skipped.length,
        failed,
        errors: [...errors, ...importResult.errors]
      });
    } catch (err) {
      setError(err.message || 'Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Import Contacts from CSV</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {!results ? (
            <>
              <div className="form-group">
                <label>Select CSV File</label>
                <div 
                  className="file-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  {file ? (
                    <div className="file-selected">
                      <FileText size={24} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{file.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {(file.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="file-upload-placeholder">
                      <Upload size={32} />
                      <div>
                        <strong>Click to select CSV file</strong>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          or drag and drop
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleDownloadTemplate}
                  type="button"
                >
                  <Download size={14} />
                  Download Template
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                  Download a sample CSV file to see the required format
                </p>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="import-info">
                <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Import Guidelines</h4>
                <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                  <li>Required columns: First Name (or Last Name), Email</li>
                  <li>Duplicate emails will be skipped</li>
                  <li>Invalid data will be corrected or skipped</li>
                  <li>Maximum recommended: 1000 contacts per import</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="import-results">
              <div className="result-header">
                <CheckCircle size={32} style={{ color: 'var(--emerald-400)' }} />
                <h3>Import Complete</h3>
              </div>

              <div className="result-stats">
                <div className="result-stat">
                  <div className="result-stat-value">{results.imported}</div>
                  <div className="result-stat-label">Imported</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-value">{results.duplicates}</div>
                  <div className="result-stat-label">Duplicates</div>
                </div>
                {results.skipped > 0 && (
                  <div className="result-stat">
                    <div className="result-stat-value">{results.skipped}</div>
                    <div className="result-stat-label">Skipped</div>
                  </div>
                )}
                {results.failed > 0 && (
                  <div className="result-stat error">
                    <div className="result-stat-value">{results.failed}</div>
                    <div className="result-stat-label">Failed</div>
                  </div>
                )}
              </div>

              {results.errors.length > 0 && (
                <div className="result-errors">
                  <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Errors:</h4>
                  <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxHeight: '200px', overflowY: 'auto' }}>
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!results ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Import Contacts
                  </>
                )}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

