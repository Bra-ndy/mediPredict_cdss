import sqlite3
import os

db_path = r"C:\pr\drug-recommendation\healthcare-ml-app\backend\instance\app.db"
print(f"Database path: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE test (id INTEGER)")
    conn.commit()
    print(" SQLite can write to the database file")
    conn.close()
    os.remove(db_path)
    print(" Test successful, database removed")
except Exception as e:
    print(f"Error: {e}")
