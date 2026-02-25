const fs = require('fs');

// Mock browser objects
global.window = {};
global.document = {
  getElementById: (id) => ({
    textContent: '',
    style: {},
    appendChild: () => {},
    innerHTML: ''
  }),
  createElement: () => ({
    className: '',
    innerHTML: ''
  })
};

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Mock dependencies
global.Chart = function() {};
global.Intl = {
  DateTimeFormat: function() {
    return {
      formatToParts: () => [{type: 'hour', value: '10'}, {type: 'minute', value: '00'}]
    };
  }
};

const appJs = fs.readFileSync('app.js', 'utf8');

// Strip out immediately-invoked things that might break in node without full DOM
let safeCode = appJs.replace(/document\.addEventListener|window\.addEventListener/g, '// ');

try {
  eval(safeCode);
  console.log('App loaded');
  
  // Set some mock state
  state.employees = [{id: 'emp1', name: 'John Doe', defaultShift: 'opt1'}];
  state.attendance = {};
  
  // Mock i18n
  global.t = (key) => key;
  global.escapeHTML = (s) => String(s);
  
  // Test renderDashboard
  console.log('Testing renderDashboard...');
  renderDashboard();
  console.log('renderDashboard executed successfully without throwing');
  
} catch (e) {
  console.error('CRASH:', e);
}
