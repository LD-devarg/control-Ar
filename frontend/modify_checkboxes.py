import re

file_path = r'c:\Users\loren\OneDrive\Escritorio\proyectos\controlar\frontend\src\pages\LandingConfig.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to detect the old stack of checkboxes at the bottom of Datos Generales
pattern = r'<Stack direction={{ xs: "column", md: "row" }} spacing={1}\s*>\s*<div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 items-start sm:items-center justify-end w-full mt-1">\s*<FormControlLabel.*?</div>\s*</Stack>'

text = re.sub(pattern, '', text, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Old checkboxes stack removed.")
