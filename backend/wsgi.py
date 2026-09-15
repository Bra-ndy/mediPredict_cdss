import os
from app import create_app, db

app = create_app(os.getenv('FLASK_CONFIG') or 'production')

# ===========================================================
# ONE-TIME DATABASE INITIALIZATION
# ===========================================================
# This runs on every startup, but is SAFE because:
# 1. db.create_all() only creates tables that don't exist
# 2. Admin user creation checks if admin already exists
# 3. No data is ever overwritten
# ===========================================================

def initialize_database():
    """Initialize database tables and admin user (idempotent)."""
    with app.app_context():
        try:
            # Import models so SQLAlchemy knows about them
            from app.models import User
            from datetime import datetime
            
            # Step 1: Create tables (safe - skips existing tables)
            db.create_all()
            print("✅ Database tables verified")
            
            # Step 2: Check if admin exists
            admin_email = 'admin@medipredict.com'
            existing_admin = User.query.filter_by(email=admin_email).first()
            
            if existing_admin:
                # Admin already exists - DO NOTHING
                print(f"✅ Admin already exists: {admin_email}")
                print(f"   Role: {existing_admin.role}")
                print(f"   Verified: {existing_admin.is_verified}")
                print(f"   Active: {existing_admin.is_active}")
            else:
                # First time - create admin user
                print(f"📝 First-time setup: Creating admin user...")
                admin = User(
                    full_name='System Administrator',
                    email=admin_email,
                    role='admin',
                    is_verified=True,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                admin.set_password('Admin@123')
                db.session.add(admin)
                db.session.commit()
                print(f"✅ Admin created successfully!")
                print(f"   Email: {admin_email}")
                print(f"   Password: Admin@123")
                print(f"   ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN")
                
        except Exception as e:
            print(f"⚠️ Initialization error: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()

# Run initialization once on startup
initialize_database()

# ===========================================================
# ENTRY POINT
# ===========================================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.getenv('FLASK_CONFIG', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)