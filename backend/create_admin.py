from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    # Check if admin exists
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
    
    # List all users
    users = User.query.all()
    print(f"Total users: {len(users)}")
    for user in users:
        print(f"  - {user.email} ({user.role})")
