import os
from app import create_app, db
from flask_cors import CORS

app = create_app(os.getenv('FLASK_CONFIG') or 'production')

# ===========================================================
# FORCE CORS CONFIGURATION (safety net)
# ===========================================================
# This overrides any CORS settings in app/__init__.py to ensure
# the headers are always sent correctly.
# ===========================================================

raw_origins = os.getenv(
    'CORS_ORIGINS',
    'https://medipredict-frontend-9zec.onrender.com,http://localhost:3000'
)

allowed_origins = [o.strip() for o in raw_origins.split(',') if o.strip()]

print(f"🔒 CORS allowed origins: {allowed_origins}")

# Remove any existing CORS extension and reapply
# flask-cors attaches itself as an extension; applying twice is safe
CORS(
    app,
    resources={r"/*": {"origins": allowed_origins}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
    send_wildcard=False
)

# ===========================================================
# HEALTH CHECK
# ===========================================================
@app.route('/health', methods=['GET', 'OPTIONS'])
def health_check():
    return {"status": "healthy", "service": "MediPredict CDSS"}, 200

# ===========================================================
# ONE-TIME DATABASE INITIALIZATION
# ===========================================================
def initialize_database():
    with app.app_context():
        try:
            from app.models import User
            from datetime import datetime

            db.create_all()
            print("✅ Database tables verified")

            admin_email = 'admin@medipredict.com'
            existing_admin = User.query.filter_by(email=admin_email).first()

            if existing_admin:
                print(f"✅ Admin already exists: {admin_email}")
                print(f"   Role: {existing_admin.role}")
                print(f"   Verified: {existing_admin.is_verified}")
            else:
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
                print(f"✅ Admin created: {admin_email}")
                print(f"   Password: Admin@123")

        except Exception as e:
            print(f"⚠️ Initialization error: {e}")
            import traceback
            traceback.print_exc()
            db.session.rollback()

initialize_database()

# ===========================================================
# ENTRY POINT
# ===========================================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.getenv('FLASK_CONFIG', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)