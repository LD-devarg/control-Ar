import sys

file_path = r'c:\Users\loren\OneDrive\Escritorio\proyectos\controlar\frontend\src\pages\LandingConfig.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# I will find the precise snippet by looking for the start and end of it.
start_str = """                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}\n                        >\n                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 items-start sm:items-center justify-end w-full mt-1">"""

end_str = """                                />\n                            </div>\n                        </Stack>"""

start_idx = text.find(start_str)
end_idx = text.find(end_str, start_idx) + len(end_str)

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + text[end_idx:]

marker3 = """                        <div className="flex w-full text-center justify-center mb-1">\n                            <h2 className="text-white font-bold text-lg underline">Recursos Visuales</h2>\n                        </div>\n                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} className="mt-1 justify-center">"""

replacement3 = """                            </div>\n                        </div>\n                        {/* Right column */}\n                        <div className="flex flex-col w-full lg:w-2/5 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 pb-2">\n                            <div className="flex w-full justify-center lg:justify-start mb-3">\n                                <h2 className="text-white font-bold text-base underline">Recursos Visuales</h2>\n                            </div>\n                            <Stack direction="column" spacing={3} className="w-full items-center">"""

text = text.replace(marker3, replacement3)

marker4 = """                        <div className="w-full gap-2 mb-2 mt-2 items-end flex justify-end">"""
replacement4 = """                        </div>\n                        <div className="w-full gap-2 mb-2 mt-4 items-center flex justify-center lg:justify-end border-t border-white/10 pt-4">"""

text = text.replace(marker4, replacement4)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
