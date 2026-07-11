import os
import re

base_dir = "/Users/nicholaselia/.gemini/antigravity/scratch/acnow-netlify"
html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]

print("Auditing header syntax, navigation menus, and footers across all HTML files:\n")

for fname in sorted(html_files):
    path = os.path.join(base_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    content = "".join(lines)
    
    # 1. Check for unclosed button tags or duplicate buttons
    # Count occurrences of '<button class="mobile-nav-toggle"'
    btn_count = content.count('class="mobile-nav-toggle"')
    print(f"File: {fname}")
    print(f"  Mobile nav toggle occurrences: {btn_count}")
    
    # Print the lines around the button tag
    for i, line in enumerate(lines):
        if 'mobile-nav-toggle' in line:
            print(f"    Line {i+1}: {line.strip()}")
            # Print next 2 lines as well
            if i + 1 < len(lines):
                print(f"    Line {i+2}: {lines[i+1].strip()}")
            if i + 2 < len(lines):
                print(f"    Line {i+3}: {lines[i+2].strip()}")
                
    # 2. Check Nav Menu structure (id, class)
    nav_matches = re.findall(r'<nav\s+([^>]+)>', content)
    print(f"  Nav tag attributes found:")
    for attrs in nav_matches:
        if 'nav-link' not in attrs: # ignore sub navs if any, focus on main
            print(f"    <nav {attrs}>")
            
    # 3. Check for Footer Links pointing to "-hybrid"
    footer_hybrid = [line.strip() for idx, line in enumerate(lines) if '-hybrid' in line and idx > len(lines)*0.7]
    if footer_hybrid:
        print(f"  ⚠️ Potential footer hybrid links found:")
        for line in footer_hybrid:
            print(f"    {line}")
    else:
        print(f"  Footer hybrid check: OK")
    print("-" * 50)
