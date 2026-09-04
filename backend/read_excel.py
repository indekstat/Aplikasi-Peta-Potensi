import pandas as pd
import json

file_path = "Contoh-Perhitungan.xlsx"
try:
    xl = pd.ExcelFile(file_path)
    sheets = xl.sheet_names
    print("Sheets:", sheets)
    
    for sheet in sheets:
        if "LQ" in sheet or "Komoditas" in sheet or "Prod" in sheet:
            df = xl.parse(sheet)
            print(f"--- Sheet: {sheet} ---")
            print(df.head(10).to_string())
except Exception as e:
    print("Error:", e)
