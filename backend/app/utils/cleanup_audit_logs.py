# app/utils/cleanup_audit_logs.py

from app import create_app, db
from app.models import User, AuditLog
from datetime import datetime, timedelta

def cleanup_and_add_realistic_logs():
    """Remove random sample logs and add more realistic ones"""
    app = create_app()
    with app.app_context():
        print("Cleaning up audit logs...")
        
        # Delete all existing audit logs
        deleted = AuditLog.query.delete()
        db.session.commit()
        print(f" Deleted {deleted} existing audit logs")
        
        # Get users
        users = User.query.all()
        if not users:
            print("No users found. Please create users first.")
            return
        
        # Create a map of user names
        user_map = {user.id: user.full_name for user in users}
        
        # Find admin user
        admin = User.query.filter_by(email='admin@medipredict.com').first()
        if not admin:
            print("Admin user not found. Please create admin user first.")
            return
        admin_id = admin.id
        
        # Find other users
        brandy = User.query.filter_by(email='dremizkipkosgei@gmail.com').first()
        brandy_id = brandy.id if brandy else None
        
        meshack = User.query.filter_by(email='mec@gmail.com').first()
        meshack_id = meshack.id if meshack else None
        
        now = datetime.utcnow()
        realistic_logs = []
        
        # Admin logs
        realistic_logs.extend([
            (admin_id, 'LOGIN_SUCCESS', 'User', admin_id, '192.168.1.100', True, 'Admin login from dashboard', now - timedelta(hours=1)),
            (admin_id, 'LOGOUT', 'User', admin_id, '192.168.1.100', True, 'Admin logout', now - timedelta(minutes=30)),
            (admin_id, 'LOGIN_SUCCESS', 'User', admin_id, '192.168.1.100', True, 'Admin login from dashboard', now - timedelta(days=1, hours=2)),
            (admin_id, 'DATA_EXPORTED', 'Audit', None, '192.168.1.100', True, 'Exported audit logs as CSV', now - timedelta(days=1, hours=5)),
        ])
        
        # User verification logs (if users exist)
        if meshack_id:
            realistic_logs.append((admin_id, 'USER_VERIFIED', 'User', meshack_id, '192.168.1.100', True, f'Verified user Meshack (mec@gmail.com)', now - timedelta(days=1, hours=3)))
        
        if brandy_id:
            realistic_logs.append((admin_id, 'USER_VERIFIED', 'User', brandy_id, '192.168.1.100', True, f'Verified user Brandy (dremizkipkosgei@gmail.com)', now - timedelta(days=1, hours=4)))
        
        # Meshack's activity
        if meshack_id:
            realistic_logs.extend([
                (meshack_id, 'LOGIN_SUCCESS', 'User', meshack_id, '192.168.1.105', True, 'Clinician login', now - timedelta(days=2, hours=10)),
                (meshack_id, 'PATIENT_CREATED', 'Patient', 101, '192.168.1.105', True, 'Created new patient: John Doe', now - timedelta(days=2, hours=11)),
                (meshack_id, 'ASSESSMENT_CREATED', 'Assessment', 201, '192.168.1.105', True, 'Created assessment for patient #101', now - timedelta(days=2, hours=13)),
                (meshack_id, 'LOGOUT', 'User', meshack_id, '192.168.1.105', True, 'Clinician logout', now - timedelta(days=2, hours=14)),
                (meshack_id, 'LOGIN_SUCCESS', 'User', meshack_id, '192.168.1.105', True, 'Clinician login', now - timedelta(days=4, hours=8)),
                (meshack_id, 'PATIENT_UPDATED', 'Patient', 101, '192.168.1.105', True, 'Updated patient contact information', now - timedelta(days=4, hours=9)),
            ])
        
        # Brandy's activity
        if brandy_id:
            realistic_logs.extend([
                (brandy_id, 'LOGIN_SUCCESS', 'User', brandy_id, '192.168.1.110', True, 'Clinician login', now - timedelta(days=3, hours=9)),
                (brandy_id, 'PATIENT_CREATED', 'Patient', 103, '192.168.1.110', True, 'Created new patient: Bob Wilson', now - timedelta(days=3, hours=10)),
                (brandy_id, 'ASSESSMENT_CREATED', 'Assessment', 202, '192.168.1.110', True, 'Created assessment for patient #102', now - timedelta(days=3, hours=11)),
                (brandy_id, 'ASSESSMENT_FINALIZED', 'Assessment', 202, '192.168.1.110', True, 'Finalized assessment with treatment plan', now - timedelta(days=3, hours=12)),
                (brandy_id, 'REPORT_GENERATED', 'Report', 301, '192.168.1.110', True, 'Generated patient assessment report', now - timedelta(days=3, hours=13)),
                (brandy_id, 'LOGOUT', 'User', brandy_id, '192.168.1.110', True, 'Clinician logout', now - timedelta(days=3, hours=15)),
            ])
        
        # Failed login attempts
        realistic_logs.extend([
            (None, 'LOGIN_FAILED', 'User', 5, '192.168.1.200', False, 'Invalid password attempt for user 5', now - timedelta(days=1, hours=6)),
            (None, 'LOGIN_FAILED', 'User', 5, '192.168.1.200', False, 'Invalid password attempt for user 5', now - timedelta(days=1, hours=7)),
            (None, 'LOGIN_FAILED', 'User', 5, '192.168.1.200', False, 'Account locked after multiple failed attempts', now - timedelta(days=1, hours=8)),
        ])
        
        # Add all logs
        for log_data in realistic_logs:
            user_id, action, resource_type, resource_id, ip, success, details, timestamp = log_data
            
            log = AuditLog(
                user_id=user_id,
                timestamp=timestamp,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                success=success,
                details=details
            )
            db.session.add(log)
        
        db.session.commit()
        
        print(f"\n Added {len(realistic_logs)} realistic audit logs")
        print(f"Total logs now: {AuditLog.query.count()}")

if __name__ == '__main__':
    cleanup_and_add_realistic_logs()