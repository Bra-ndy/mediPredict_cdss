from app import create_app, db
from app.models import User, AuditLog
from datetime import datetime, timedelta
import random

def generate_sample_logs():
    """Generate sample audit logs for testing"""
    app = create_app()
    with app.app_context():
        # Check if we already have logs
        if AuditLog.query.count() > 0:
            print(f"Already have {AuditLog.query.count()} audit logs. Skipping sample generation.")
            return
        
        # Get some users
        users = User.query.all()
        if not users:
            print("No users found. Please create users first.")
            return
        
        print(f"Generating sample audit logs for {len(users)} users...")
        
        # Sample actions
        actions = [
            ('LOGIN_SUCCESS', True),
            ('LOGIN_FAILED', False),
            ('LOGOUT', True),
            ('PASSWORD_RESET_REQUEST', True),
            ('PASSWORD_RESET_COMPLETE', True),
            ('ACCOUNT_CREATED', True),
            ('USER_VERIFIED', True),
            ('USER_REJECTED', True),
            ('PATIENT_CREATED', True),
            ('PATIENT_UPDATED', True),
            ('ASSESSMENT_CREATED', True),
            ('ASSESSMENT_FINALIZED', True),
            ('REPORT_GENERATED', True),
            ('REPORT_VIEWED', True),
            ('DATA_EXPORTED', True)
        ]
        
        # Resource types
        resource_types = ['User', 'Patient', 'Assessment', 'Report']
        
        # Generate logs for the last 7 days
        for days_ago in range(7, 0, -1):
            for hour in range(24):
                # Randomly decide to create a log (about 30% chance)
                if random.random() < 0.3:
                    timestamp = datetime.utcnow() - timedelta(days=days_ago, hours=hour)
                    
                    # Pick random user
                    user = random.choice(users)
                    
                    # Pick random action
                    action, success = random.choice(actions)
                    
                    # Pick random resource
                    resource_type = random.choice(resource_types)
                    resource_id = random.randint(1, 10)
                    
                    # Create log
                    log = AuditLog(
                        user_id=user.id,
                        timestamp=timestamp,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        ip_address=f"192.168.1.{random.randint(100, 200)}",
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        success=success,
                        details=f"Sample {action} log for testing"
                    )
                    db.session.add(log)
        
        # Add some specific logs for the admin user
        admin = User.query.filter_by(email='admin@medipredict.com').first()
        if admin:
            # Login success
            log = AuditLog(
                user_id=admin.id,
                timestamp=datetime.utcnow() - timedelta(minutes=30),
                action='LOGIN_SUCCESS',
                resource_type='User',
                resource_id=admin.id,
                ip_address='192.168.1.100',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                success=True,
                details='Admin login from dashboard'
            )
            db.session.add(log)
            
            # User verification
            pending_user = User.query.filter_by(role='pending').first()
            if pending_user:
                log = AuditLog(
                    user_id=admin.id,
                    timestamp=datetime.utcnow() - timedelta(hours=2),
                    action='USER_VERIFIED',
                    resource_type='User',
                    resource_id=pending_user.id,
                    ip_address='192.168.1.100',
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    success=True,
                    details=f'Verified user {pending_user.email}'
                )
                db.session.add(log)
        
        db.session.commit()
        print(f" Generated {AuditLog.query.count()} sample audit logs")

if __name__ == '__main__':
    generate_sample_logs()