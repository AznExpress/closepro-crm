// CSV import/export service for contacts

/**
 * Export contacts to CSV
 */
export function exportContactsToCSV(contacts) {
  if (!contacts || contacts.length === 0) {
    throw new Error('No contacts to export');
  }

  // Define CSV headers
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Temperature',
    'Property Interest',
    'Budget',
    'Lead Source',
    'Deal Stage',
    'Deal Value',
    'Expected Close Date',
    'Birthday',
    'Home Anniversary',
    'Notes',
    'Created At',
    'Last Contact'
  ];

  // Convert contacts to CSV rows
  const rows = contacts.map(contact => [
    escapeCSV(contact.firstName || ''),
    escapeCSV(contact.lastName || ''),
    escapeCSV(contact.email || ''),
    escapeCSV(contact.phone || ''),
    escapeCSV(contact.company || ''),
    escapeCSV(contact.temperature || ''),
    escapeCSV(contact.propertyInterest || ''),
    escapeCSV(contact.budget || ''),
    escapeCSV(contact.leadSource || ''),
    escapeCSV(contact.dealStage || ''),
    contact.dealValue ? contact.dealValue.toString() : '',
    contact.expectedCloseDate ? formatDate(contact.expectedCloseDate) : '',
    contact.birthday ? formatDate(contact.birthday) : '',
    contact.homeAnniversary ? formatDate(contact.homeAnniversary) : '',
    escapeCSV(contact.notes || ''),
    contact.createdAt ? formatDate(contact.createdAt) : '',
    contact.lastContact ? formatDate(contact.lastContact) : ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Add BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `closepro-contacts-${formatDateForFilename(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import contacts from CSV file
 */
export async function importContactsFromCSV(file, options = {}) {
  const {
    skipDuplicates = true,
    updateExisting = false,
    onProgress = null
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const contacts = parseCSV(text);
        
        if (contacts.length === 0) {
          reject(new Error('No contacts found in CSV file'));
          return;
        }

        // Validate contacts
        const validation = validateContacts(contacts);
        
        if (validation.errors.length > 0) {
          reject(new Error(`Validation errors:\n${validation.errors.join('\n')}`));
          return;
        }

        resolve({
          contacts: validation.validContacts,
          skipped: validation.skipped,
          errors: validation.errors,
          total: contacts.length
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse CSV text into contact objects
 */
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return []; // Need at least header + 1 row

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  
  // Map header names to contact fields
  const headerMap = {
    'first name': 'firstName',
    'firstname': 'firstName',
    'first_name': 'firstName',
    'last name': 'lastName',
    'lastname': 'lastName',
    'last_name': 'lastName',
    'email': 'email',
    'phone': 'phone',
    'company': 'company',
    'temperature': 'temperature',
    'property interest': 'propertyInterest',
    'property_interest': 'propertyInterest',
    'budget': 'budget',
    'lead source': 'leadSource',
    'lead_source': 'leadSource',
    'deal stage': 'dealStage',
    'deal_stage': 'dealStage',
    'deal value': 'dealValue',
    'deal_value': 'dealValue',
    'expected close date': 'expectedCloseDate',
    'expected_close_date': 'expectedCloseDate',
    'birthday': 'birthday',
    'home anniversary': 'homeAnniversary',
    'home_anniversary': 'homeAnniversary',
    'notes': 'notes',
    'created at': 'createdAt',
    'created_at': 'createdAt',
    'last contact': 'lastContact',
    'last_contact': 'lastContact'
  };

  // Parse data rows
  const contacts = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const contact = {
      firstName: '',
      lastName: '',
      email: '',
      temperature: 'warm',
      propertyInterest: 'Buying'
    };

    headers.forEach((header, index) => {
      const field = headerMap[header.toLowerCase()];
      if (field && values[index] !== undefined) {
        const value = values[index].trim();
        
        // Handle different field types
        if (field === 'dealValue' && value) {
          contact[field] = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
        } else if ((field === 'expectedCloseDate' || field === 'birthday' || field === 'homeAnniversary' || field === 'createdAt' || field === 'lastContact') && value) {
          contact[field] = parseDate(value);
        } else if (value) {
          contact[field] = value;
        }
      }
    });

    // Only add if has required fields
    if (contact.firstName || contact.lastName || contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);
  return result;
}

/**
 * Validate contacts before import
 */
function validateContacts(contacts) {
  const validContacts = [];
  const errors = [];
  const skipped = [];
  const seenEmails = new Set();

  contacts.forEach((contact, index) => {
    const rowNum = index + 2; // +2 because CSV has header and is 1-indexed

    // Required fields
    if (!contact.firstName && !contact.lastName) {
      errors.push(`Row ${rowNum}: Missing first name and last name`);
      return;
    }

    if (!contact.email) {
      errors.push(`Row ${rowNum}: Missing email address`);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      errors.push(`Row ${rowNum}: Invalid email format: ${contact.email}`);
      return;
    }

    // Check for duplicates
    const emailLower = contact.email.toLowerCase();
    if (seenEmails.has(emailLower)) {
      skipped.push(`Row ${rowNum}: Duplicate email: ${contact.email}`);
      return;
    }
    seenEmails.add(emailLower);

    // Validate temperature
    if (contact.temperature && !['hot', 'warm', 'cold'].includes(contact.temperature.toLowerCase())) {
      contact.temperature = 'warm'; // Default
    } else if (contact.temperature) {
      contact.temperature = contact.temperature.toLowerCase();
    }

    // Validate deal stage
    const validStages = ['prospect', 'showing', 'offer', 'under_contract', 'closing', 'closed', 'lost'];
    if (contact.dealStage && !validStages.includes(contact.dealStage.toLowerCase())) {
      contact.dealStage = null; // Remove invalid stage
    }

    validContacts.push(contact);
  });

  return {
    validContacts,
    errors,
    skipped,
    total: contacts.length
  };
}

/**
 * Escape CSV field value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Format date for CSV
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch {
    return '';
  }
}

/**
 * Parse date from various formats
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Try ISO format first
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // Try common formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
  ];
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        date = new Date(match[1], match[2] - 1, match[3]);
      } else {
        // MM/DD/YYYY or MM-DD-YYYY
        date = new Date(match[3], match[1] - 1, match[2]);
      }
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  
  return null;
}

/**
 * Format date for filename
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate CSV template for download
 */
export function downloadCSVTemplate() {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Temperature',
    'Property Interest',
    'Budget',
    'Lead Source',
    'Deal Stage',
    'Deal Value',
    'Expected Close Date',
    'Birthday',
    'Home Anniversary',
    'Notes'
  ];

  const exampleRow = [
    'John',
    'Smith',
    'john.smith@email.com',
    '(555) 123-4567',
    'Smith Family Trust',
    'hot',
    'Buying',
    '$500,000 - $750,000',
    'referral',
    'showing',
    '650000',
    '2024-12-31',
    '1985-06-15',
    '2020-03-20',
    'Looking for 3BR home in suburbs'
  ];

  const csvContent = [
    headers.join(','),
    exampleRow.join(',')
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'closepro-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

