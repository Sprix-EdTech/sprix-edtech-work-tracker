/**
 * ==========================================
 * SPRIX Ramadan Work Tracker — Google Apps Script
 * Backend API for Google Sheets integration
 * ==========================================
 * 
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire code into Code.gs
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the deployed URL and paste it into the frontend
 */

// ---- Configuration ----
const SHEET_EMPLOYEES = 'Employees';
const SHEET_ATTENDANCE = 'Attendance';
const SHEET_LOG = 'Log';

// ---- Web App Entry Points ----

/**
 * Handle GET requests (read data)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'load';
    let result;

    switch (action) {
      case 'load':
        result = loadAllData();
        break;
      case 'employees':
        result = getEmployees();
        break;
      case 'attendance':
        const date = e.parameter.date || getTodayKey();
        result = getAttendance(date);
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Handle POST requests (write data)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'sync';
    let result;

    switch (action) {
      case 'sync':
        result = syncAllData(data);
        break;
      case 'updateEmployee':
        result = updateEmployee(data.employee);
        break;
      case 'updateAttendance':
        result = updateAttendanceRecord(data.date, data.empId, data.record);
        break;
      case 'deleteEmployee':
        result = deleteEmployee(data.empId);
        break;
      default:
        result = { error: 'Unknown action' };
    }

    logAction(action, data);
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

// ---- Data Operations ----

/**
 * Load all data (employees + attendance)
 */
function loadAllData() {
  const employees = getEmployees();
  const attendance = getAllAttendance();

  return {
    success: true,
    employees: employees,
    attendance: attendance,
    lastSync: new Date().toISOString(),
  };
}

/**
 * Sync all data from frontend
 */
function syncAllData(data) {
  const ss = getSpreadsheet();

  // Sync employees
  if (data.employees && Array.isArray(data.employees)) {
    syncEmployees(ss, data.employees);
  }

  // Sync attendance
  if (data.attendance && typeof data.attendance === 'object') {
    syncAttendance(ss, data.attendance);
  }

  return {
    success: true,
    message: 'Data synced successfully',
    lastSync: new Date().toISOString(),
  };
}

// ---- Employee Operations ----

/**
 * Get all employees from the sheet
 */
function getEmployees() {
  const sheet = getOrCreateSheet(SHEET_EMPLOYEES, ['ID', 'Name', 'Department', 'DefaultShift', 'RemoteDay']);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    department: row[2],
    defaultShift: row[3],
    remoteDay: row[4] !== '' ? String(row[4]) : '',
  })).filter(emp => emp.id); // Filter out empty rows
}

/**
 * Sync employees (full replace)
 */
function syncEmployees(ss, employees) {
  const sheet = getOrCreateSheet(SHEET_EMPLOYEES, ['ID', 'Name', 'Department', 'DefaultShift', 'RemoteDay']);

  // Clear existing data (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

  // Write new data
  if (employees.length > 0) {
    const values = employees.map(emp => [
      emp.id,
      emp.name,
      emp.department || '',
      emp.defaultShift || '9-15',
      emp.remoteDay !== undefined ? emp.remoteDay : '',
    ]);
    sheet.getRange(2, 1, values.length, 5).setValues(values);
  }

  // Format the sheet
  formatSheet(sheet);
}

/**
 * Update a single employee
 */
function updateEmployee(employee) {
  if (!employee || !employee.id) return { error: 'Employee ID required' };

  const sheet = getOrCreateSheet(SHEET_EMPLOYEES, ['ID', 'Name', 'Department', 'DefaultShift', 'RemoteDay']);
  const data = sheet.getDataRange().getValues();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === employee.id) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[
        employee.id,
        employee.name,
        employee.department || '',
        employee.defaultShift || '9-15',
        employee.remoteDay !== undefined ? employee.remoteDay : '',
      ]]);
      found = true;
      break;
    }
  }

  if (!found) {
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 5).setValues([[
      employee.id,
      employee.name,
      employee.department || '',
      employee.defaultShift || '9-15',
      employee.remoteDay !== undefined ? employee.remoteDay : '',
    ]]);
  }

  return { success: true, message: `Employee ${employee.name} saved` };
}

/**
 * Delete an employee
 */
function deleteEmployee(empId) {
  if (!empId) return { error: 'Employee ID required' };

  const sheet = getOrCreateSheet(SHEET_EMPLOYEES, ['ID', 'Name', 'Department', 'DefaultShift', 'RemoteDay']);
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === empId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  return { success: true, message: 'Employee deleted' };
}

// ---- Attendance Operations ----

/**
 * Get all attendance records
 */
function getAllAttendance() {
  const sheet = getOrCreateSheet(SHEET_ATTENDANCE, ['Date', 'EmployeeID', 'Status', 'Shift']);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return {};

  const attendance = {};
  data.slice(1).forEach(row => {
    const date = row[0];
    const empId = row[1];
    const status = row[2];
    const shift = row[3];

    if (!date || !empId) return;

    if (!attendance[date]) attendance[date] = {};
    attendance[date][empId] = { status, shift };
  });

  return attendance;
}

/**
 * Get attendance for a specific date
 */
function getAttendance(date) {
  const all = getAllAttendance();
  return all[date] || {};
}

/**
 * Sync attendance (full replace)
 */
function syncAttendance(ss, attendance) {
  const sheet = getOrCreateSheet(SHEET_ATTENDANCE, ['Date', 'EmployeeID', 'Status', 'Shift']);

  // Clear existing data (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  }

  // Flatten attendance data
  const values = [];
  Object.keys(attendance).sort().forEach(date => {
    const dayData = attendance[date];
    Object.keys(dayData).forEach(empId => {
      const record = dayData[empId];
      values.push([date, empId, record.status, record.shift]);
    });
  });

  // Write data
  if (values.length > 0) {
    sheet.getRange(2, 1, values.length, 4).setValues(values);
  }

  formatSheet(sheet);
}

/**
 * Update a single attendance record
 */
function updateAttendanceRecord(date, empId, record) {
  if (!date || !empId) return { error: 'Date and EmployeeID required' };

  const sheet = getOrCreateSheet(SHEET_ATTENDANCE, ['Date', 'EmployeeID', 'Status', 'Shift']);
  const data = sheet.getDataRange().getValues();

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === date && data[i][1] === empId) {
      sheet.getRange(i + 1, 3, 1, 2).setValues([[record.status, record.shift]]);
      found = true;
      break;
    }
  }

  if (!found) {
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 4).setValues([[date, empId, record.status, record.shift]]);
  }

  return { success: true };
}

// ---- Helper Functions ----

/**
 * Get the active spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Get or create a sheet with headers
 */
function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Style header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#043586');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setHorizontalAlignment('center');

    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 150);
  }

  return sheet;
}

/**
 * Format a sheet with styling
 */
function formatSheet(sheet) {
  // Auto-resize columns
  const lastCol = sheet.getLastColumn();
  if (lastCol > 0) {
    for (let c = 1; c <= lastCol; c++) {
      sheet.autoResizeColumn(c);
    }
  }
}

/**
 * Create a CORS-enabled JSON response
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Get today's date key (YYYY-MM-DD)
 */
function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Log an action for auditing
 */
function logAction(action, data) {
  try {
    const sheet = getOrCreateSheet(SHEET_LOG, ['Timestamp', 'Action', 'Details']);
    sheet.appendRow([
      new Date().toISOString(),
      action,
      JSON.stringify(data).substring(0, 500),
    ]);

    // Keep only last 100 log entries
    const lastRow = sheet.getLastRow();
    if (lastRow > 101) {
      sheet.deleteRows(2, lastRow - 101);
    }
  } catch (e) {
    // Logging should not break the main operation
    console.error('Log error:', e);
  }
}

// ---- Initial Setup ----

/**
 * Run this once to set up the spreadsheet
 */
function initialSetup() {
  const ss = getSpreadsheet();

  // Create sheets
  getOrCreateSheet(SHEET_EMPLOYEES, ['ID', 'Name', 'Department', 'DefaultShift', 'RemoteDay']);
  getOrCreateSheet(SHEET_ATTENDANCE, ['Date', 'EmployeeID', 'Status', 'Shift']);
  getOrCreateSheet(SHEET_LOG, ['Timestamp', 'Action', 'Details']);

  // Set spreadsheet title
  ss.rename('SPRIX Ramadan Work Tracker 2026');

  // Delete default Sheet1 if it exists
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.getUi().alert('✅ Setup complete! Now deploy this script as a Web App.');
}
