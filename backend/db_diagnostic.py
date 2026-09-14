import os
from app import create_app

app = create_app()

print("=" * 60)
print("DATABASE DIAGNOSTICS")
print("=" * 60)

# Get the database URI
db_uri = app.config['SQLALCHEMY_DATABASE_URI']
print(f"Database URI: {db_uri}")

# Parse the path from the URI
if db_uri.startswith('sqlite:///'):
    db_path = db_uri.replace('sqlite:///', '')
    # Handle relative paths
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.getcwd(), db_path)
    print(f"Database path: {db_path}")
    print(f"Database directory: {os.path.dirname(db_path)}")
    
    # Check if directory exists
    db_dir = os.path.dirname(db_path)
    if os.path.exists(db_dir):
        print(f" Directory exists: {db_dir}")
    else:
        print(f" Directory does NOT exist: {db_dir}")
    
    # Check write permissions
    if os.path.exists(db_dir):
        test_file = os.path.join(db_dir, "test_write.tmp")
        try:
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
            print(f" Directory is writable")
        except:
            print(f" Directory is NOT writable")
else:
    print(f"Not a SQLite database")

# Check if we're in the right directory
print(f"\nCurrent working directory: {os.getcwd()}")
print(f"Instance folder: {app.instance_path}")
print(f"Instance folder exists: {os.path.exists(app.instance_path)}")

# Try to create the database directly using SQLAlchemy
print("\n" + "=" * 60)
print("ATTEMPTING TO CREATE DATABASE")
print("=" * 60)

from sqlalchemy import create_engine

try:
    engine = create_engine(db_uri)
    with engine.connect() as conn:
        conn.execute("SELECT 1")
        print(" SQLAlchemy can connect to the database!")
    engine.dispose()
except Exception as e:
    print(f"Error: {e}")
