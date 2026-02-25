const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const replacementFunc = `
function getCurrentEgyptDateKey() {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dtf.formatToParts(new Date());
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  const y = parts.find(p => p.type === 'year').value;
  return \`\${y}-\${m}-\${d}\`;
}
`;

// Find getEgyptTimeMinutes() and append the new function
const match = content.match(/function getEgyptTimeMinutes\(\) \{[\s\S]*?\n\}/);
if (match) {
    const newBlock = match[0] + '\n' + replacementFunc;
    content = content.replace(match[0], newBlock);
} else {
    console.error("Could not find getEgyptTimeMinutes in app.js");
}

// Replace exact strings
content = content.split('getDateKey(new Date())').join('getCurrentEgyptDateKey()');

fs.writeFileSync('app.js', content, 'utf8');
console.log('Replaced dates successfully.');
