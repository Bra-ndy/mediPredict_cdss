from app import create_app, db

app = create_app()
print("Creating database tables...")

with app.app_context():
    db.create_all()
    print(" Database tables created successfully!")
    
    
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables created: {tables}")
