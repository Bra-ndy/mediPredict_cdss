from app import create_app, db
from sqlalchemy import text

app = create_app()

print("Creating database tables...")

with app.app_context():
    try:
        # Create all tables
        db.create_all()
        print(" Database tables created successfully!")
        
        # List all tables
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"Tables created: {tables}")
        
        # Create a test admin user if none exists
        from app.models import User
        admin = User.query.filter_by(email='admin@medipredict.com').first()
        if not admin:
            admin = User(
                full_name='Admin User',
                email='admin@medipredict.com',
                role='admin',
                is_verified=True,
                is_active=True,
                license_number='ADMIN001'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print(" Admin user created: admin@medipredict.com / admin123")
        else:
            print(" Admin user already exists")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
