import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Inject getEgyptTimeMinutes
egypt_func = """
function getEgyptTimeMinutes() {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = dtf.formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return hour * 60 + minute;
}
"""

if "function getEgyptTimeMinutes" not in js:
    js = egypt_func + "\n" + js

# 2. Replace all instances of:
# const now = new Date();
# const currentMinutes = now.getHours() * 60 + now.getMinutes();
# with const currentMinutes = getEgyptTimeMinutes();

js = re.sub(
    r'const now = new Date\(\);\s*const currentMinutes = now\.getHours\(\) \* 60 \+ now\.getMinutes\(\);',
    r'const currentMinutes = getEgyptTimeMinutes();',
    js
)

# 3. Update the isFinished blocks to include isStarted
old_finished_block = r"""      let isFinished = false;
      if \(status !== 'leave'\) \{
        const shiftText = getShiftString\(record\?\.shift \|\| (emp\.defaultShift|getDefaultShift\(emp\))\);
        const endTimeStr = shiftText\.split\('-'\)\[1\]\?\.trim\(\);
        if \(endTimeStr\) \{
          const \[hours, mins\] = endTimeStr\.split\(':'\)\.map\(Number\);
          if \(currentMinutes >= hours \* 60 \+ mins\) \{
            isFinished = true;
          \}
        \}
      \}"""

new_finished_block = r"""      let isFinished = false;
      let isStarted = true;
      if (status !== 'leave') {
        const shiftText = getShiftString(record?.shift || \1);
        const parts = shiftText.split('-');
        const startTimeStr = parts[0]?.trim();
        const endTimeStr = parts[1]?.trim();
        if (endTimeStr) {
          const [hours, mins] = endTimeStr.split(':').map(Number);
          if (currentMinutes >= hours * 60 + mins) isFinished = true;
        }
        if (startTimeStr) {
          const [sHours, sMins] = startTimeStr.split(':').map(Number);
          if (currentMinutes < sHours * 60 + sMins) isStarted = false;
        }
      }"""

js = re.sub(old_finished_block, new_finished_block, js)

# 4. Update the filter return in renderDashboard (around line 360)
js = js.replace(
    "if (isFinished) return false; // If filtering by anything other than finished, hide finished people",
    "if (isFinished) return false; // If filtering by anything other than finished, hide finished people\n      if (!isStarted && (status === 'office' || status === 'remote')) return false;"
)

# 5. Update updateGlobalStats counting
old_stats_count = r"""    if \(status === 'leave'\) \{
      leave\+\+;
    \} else if \(isFinished\) \{
      finished\+\+;
    \} else if \(status === 'office'\) \{
      office\+\+;
    \} else if \(status === 'remote'\) \{
      remote\+\+;
    \}"""

new_stats_count = """    if (status === 'leave') {
      leave++;
    } else if (isFinished) {
      finished++;
    } else if (!isStarted && (status === 'office' || status === 'remote')) {
      // Do not count as office/remote until shift starts
    } else if (status === 'office') {
      office++;
    } else if (status === 'remote') {
      remote++;
    }"""

js = re.sub(old_stats_count, new_stats_count, js)

# 6. Update export counting
old_export_count = r"""      if \(status === 'leave'\) leaveCount\+\+;
      else if \(isFinished\) finishedCount\+\+;
      else if \(status === 'office'\) officeCount\+\+;
      else if \(status === 'remote'\) remoteCount\+\+;"""

new_export_count = """      if (status === 'leave') leaveCount++;
      else if (isFinished) finishedCount++;
      else if (!isStarted && (status === 'office' || status === 'remote')) { /* skip */ }
      else if (status === 'office') officeCount++;
      else if (status === 'remote') remoteCount++;"""

js = re.sub(old_export_count, new_export_count, js)

# 7. Format Ramadan text properly for 3-line output
old_ramadan = r"""    if \(currentLang === 'ja'\) dayEl\.textContent = `\$\{d\}日`;
    else if \(currentLang === 'en'\) dayEl\.textContent = `Day \$\{d\}`;
    else dayEl\.textContent = `يوم \$\{d\}`;"""

new_ramadan = """    if (currentLang === 'ja') dayEl.textContent = `${d}日`;
    else dayEl.textContent = `${d}`; // EN/AR line 2 is just the number"""

js = re.sub(old_ramadan, new_ramadan, js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("app.js patched successfully.")
