from app import create_app, db

app = create_app()
print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")

with app.app_context():
    print("Creating tables...")
    db.create_all()
    print(" Database tables created successfully!")
    
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")
