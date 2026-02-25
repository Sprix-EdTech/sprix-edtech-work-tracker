const fs = require('fs');

const code = fs.readFileSync('app.js', 'utf8');

// Basic checks for common mistakes in the file
let hasErrors = false;

// Check for getElementById that doesn't exist in index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
const idMatches = code.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
const ids = new Set();
for (const match of idMatches) {
    const id = match[1];
    if (!indexHtml.includes(`id="${id}"`)) {
        console.log(`WARNING: getElementById('${id}') found in app.js but not in index.html!`);
        hasErrors = true;
    }
}

// Check for global variable leaks (very basic)
// Look for assignments to variables not declared with let/const/var
// (This is hard with regex, maybe skip for now and focus on obvious ones)

if (!hasErrors) console.log("No obvious DOM ID mismatches found.");
