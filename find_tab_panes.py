with open('app/templates/admin_dashboard.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines, 1):
    if 'tab-pane' in l:
        print(f"Line {i}: {l.strip()}")
