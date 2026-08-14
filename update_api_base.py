import os
import glob

# Files to update
files_to_update = glob.glob('frontend/src/**/*.tsx', recursive=True) + glob.glob('frontend/src/**/*.ts', recursive=True)

search_string = 'process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"'
replace_string = '""'

updated_count = 0
for filepath in files_to_update:
    with open(filepath, 'r') as f:
        content = f.read()
    
    if search_string in content:
        content = content.replace(search_string, replace_string)
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
        updated_count += 1

print(f"Total files updated: {updated_count}")
