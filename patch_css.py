with open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

mobile_css = """
/* Phase 10: Mobile Optimization for Sticky Row */
@media (max-width: 768px) {
  .dashboard-stats {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    padding-bottom: 8px !important;
  }
  .dashboard-stats .status-card {
    min-width: 140px !important;
    flex-shrink: 0;
    scroll-snap-align: start;
  }
}
"""

with open("style.css", "a", encoding="utf-8") as f:
    f.write(mobile_css)

print("style.css patched for mobile.")
