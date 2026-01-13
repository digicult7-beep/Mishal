
import os

file_path = 'app/src/pages/AdminDashboard.tsx'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Keep lines 1-94 (indices 0-93)
part1 = lines[:94]

# Keep lines 192-end (indices 191-end)
part2 = lines[191:]

# Dedent part2 by 12 spaces
cleaned_part2 = []
for line in part2:
    if line.startswith('            '):
        cleaned_part2.append(line[12:])
    elif line.strip() == '':
        cleaned_part2.append(line)
    else:
        # If line doesn't have 12 spaces, just keep it (or maybe it's less indented?)
        # Line 534 is just empty or closing brace?
        # Let's just strip 12 spaces if possible, else leave as is.
        cleaned_part2.append(line)

with open(file_path, 'w') as f:
    f.writelines(part1 + cleaned_part2)

print("Fixed AdminDashboard.tsx")
