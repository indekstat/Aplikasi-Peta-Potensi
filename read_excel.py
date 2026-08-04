import pandas as pd
import sys

try:
    df = pd.read_excel('Contoh-Perhitungan.xlsx', sheet_name=None)
    for sheet_name, sheet_data in df.items():
        print(f"--- Sheet: {sheet_name} ---")
        print(sheet_data.head(10))
        print("\n")
except Exception as e:
    print(f"Error: {e}")
