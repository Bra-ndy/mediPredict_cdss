import sqlite3
import os

db_path = r"C:\pr\drug-recommendation\healthcare-ml-app\backend\instance\app.db"

print(f"Creating database at: {db_path}")

try:
    if os.path.exists(db_path):
        os.remove(db_path)
        print("Removed existing database")
    
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create a simple table
    cursor.execute('''
        CREATE TABLE test (
            id INTEGER PRIMARY KEY,
            name TEXT
        )
    ''')
    
    # Insert test data
    cursor.execute("INSERT INTO test (name) VALUES (?)", ("test",))
    conn.commit()
    
    # Verify the table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"Tables created: {tables}")
    
    # Verify data
    cursor.execute("SELECT * FROM test")
    data = cursor.fetchall()
    print(f"Data: {data}")
    
    conn.close()
    print(" SQLite database created successfully!")
    
    # Clean up test table
    os.remove(db_path)
    print(" Test database removed")
    
except Exception as e:
    print(f"Error: {e}")
