import os
import re

def process_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    
    # Replace ${API_BASE}/api/somepath/ with ${API_BASE}/api/somepath
    new_content = re.sub(r"(\$\{API_BASE\}/api/[a-zA-Z0-9_\-]+(?:/[a-zA-Z0-9_\-]+)*)/([`'\"])", r"\1\2", content)
    
    # Also replace /api/bps/ with /api/bps
    new_content = re.sub(r"(/api/[a-zA-Z0-9_\-]+(?:/[a-zA-Z0-9_\-]+)*)/([`'\"])", r"\1\2", new_content)
    
    if new_content != content:
        with open(filepath, "w") as f:
            f.write(new_content)
        print("Updated", filepath)

for root, dirs, files in os.walk("frontend/src"):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            process_file(os.path.join(root, file))
