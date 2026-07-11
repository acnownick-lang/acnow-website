import os
import re
from urllib.parse import urlparse

base_dir = "/Users/nicholaselia/.gemini/antigravity/scratch/acnow-netlify"

html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]

# Store all parsed IDs per HTML file
file_ids = {}
for fname in html_files:
    path = os.path.join(base_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract IDs and names
    ids = set(re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']', content))
    names = set(re.findall(r'<a\s+[^>]*\bname\s*=\s*["\']([^"\']+)["\']', content))
    file_ids[fname] = ids.union(names)

errors = []
warnings = []
checked_links = 0

for fname in html_files:
    path = os.path.join(base_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find all hrefs
    hrefs = re.findall(r'\bhref\s*=\s*["\']([^"\']*)["\']', content)
    
    for href in hrefs:
        # Normalize and skip non-navigational links
        if href.startswith(('tel:', 'mailto:', 'sms:', 'javascript:', 'data:')):
            continue
            
        checked_links += 1
        
        # Check external links
        if href.startswith(('http://', 'https://')):
            parsed_url = urlparse(href)
            if parsed_url.netloc == 'acnowllc.netlify.app':
                # Map to local path
                local_path = parsed_url.path
                anchor = parsed_url.fragment
            else:
                # External link
                continue
        else:
            parsed_url = urlparse(href)
            local_path = parsed_url.path
            anchor = parsed_url.fragment
            
        if not href:
            errors.append((fname, href, "Empty href attribute"))
            continue
            
        # Just an anchor
        if not local_path and anchor:
            if anchor not in file_ids[fname]:
                errors.append((fname, href, f"Anchor #{anchor} does not exist in {fname}"))
            continue
            
        # Path specified
        if local_path:
            # Map path to file system path
            # Remove leading /
            rel_path = local_path.lstrip('/')
            if not rel_path:
                rel_path = "index.html"
                
            # If extensionless or trailing slash, handle Netlify routing:
            # E.g., "/services/" or "/services" -> "/services.html"
            actual_file = rel_path
            if not actual_file.endswith('.html') and not os.path.isdir(os.path.join(base_dir, actual_file)):
                # If there's an HTML file with this name
                if actual_file + '.html' in file_ids:
                    actual_file = actual_file + '.html'
                elif actual_file == "index":
                    actual_file = "index.html"
            
            full_target_path = os.path.join(base_dir, actual_file)
            
            # Check if file exists
            if not os.path.exists(full_target_path):
                errors.append((fname, href, f"Target path '{actual_file}' (from '{href}') does not exist"))
            else:
                # File exists, if it's an HTML file, check the anchor
                if actual_file in file_ids and anchor:
                    if anchor not in file_ids[actual_file]:
                        errors.append((fname, href, f"Anchor #{anchor} does not exist in target file {actual_file}"))

print(f"Audited {checked_links} page navigation links in local files.")
if errors:
    print(f"Found {len(errors)} broken links:")
    for err in errors:
        print(f"  [{err[0]}] '{err[1]}' -> {err[2]}")
else:
    print("All local href files and anchors verified successfully!")
