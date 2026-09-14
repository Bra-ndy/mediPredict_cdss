import sqlite3
import os

db_path = os.path.join('instance', 'app.db')

# Check if database exists
if os.path.exists(db_path):
    print(f" Database found at: {db_path}")
    print(f" File size: {os.path.getsize(db_path) / 1024:.2f} KB")
else:
    print(f" Database not found at: {db_path}")
    exit()

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("\n" + "="*50)
print("DATABASE TABLES")
print("="*50)

for table in tables:
    table_name = table[0]
    print(f"\n TABLE: {table_name}")
    print("-"*30)
    
    # Get column names
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    print(f"Columns: {', '.join([col[1] for col in columns])}")
    
    # Get row count
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"Rows: {count}")
    
    # Show first 3 rows if data exists
    if count > 0:
        print("\nSample data (first 3 rows):")
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
        rows = cursor.fetchall()
        for i, row in enumerate(rows, 1):
            print(f"  Row {i}: {row[:5]}..." if len(row) > 5 else f"  Row {i}: {row}")

conn.close()
print("\n" + "="*50)