from flask import jsonify, request
from app.admin import admin
from app.models import User, AuditLog
from app import db
from datetime import datetime, timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.audit import log_audit, AuditActions  

# Test route
@admin.route('/test', methods=['GET'])
@jwt_required()
def test_route():
    return jsonify({'message': 'Admin test route working!', 'status': 'success'}), 200

# Pending users routes
@admin.route('/pending-users', methods=['GET'])
@jwt_required()
def get_pending_users():
    """Get all users with pending status"""
    try:
        pending_users = User.query.filter_by(role='pending').all()
        users_data = []
        for user in pending_users:
            users_data.append({
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'is_verified': user.is_verified
            })
        return jsonify(users_data), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@admin.route('/pending-count', methods=['GET'])
@jwt_required()
def get_pending_count():
    """Get count of pending users"""
    try:
        count = User.query.filter_by(role='pending').count()
        return jsonify({'count': count}), 200
    except Exception as e:
        return jsonify({'count': 0}), 500

# Verified users route - KEEP THIS ONE (with is_active field)
@admin.route('/verified-users', methods=['GET'])
@jwt_required()
def get_verified_users():
    """Get verified users with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        users = User.query.filter(User.role != 'pending').paginate(page=page, per_page=per_page)
        users_data = [{
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'role': user.role,
            'is_verified': user.is_verified,
            'is_active': user.is_active,  # <-- ADD THIS LINE
            'license_number': user.license_number,
            'institution': user.institution,
            'specialization': user.specialization,
            'verified_by': user.verified_by,
            'verified_at': user.verified_at.isoformat() if user.verified_at else None,
            'created_at': user.created_at.isoformat() if user.created_at else None
        } for user in users.items]

        return jsonify({
            'users': users_data,
            'total': users.total,
            'pages': users.pages,
            'current_page': users.page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== AUDIT LOGS ENDPOINT =====
@admin.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit logs with filtering and pagination"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        status_filter = request.args.get('status', '')

        per_page = 20

       
        query = AuditLog.query

       
        if user_filter:
           
            try:
                user_id = int(user_filter)
                query = query.filter(AuditLog.user_id == user_id)
            except ValueError:
                
                query = query.join(User).filter(
                    User.full_name.ilike(f'%{user_filter}%')
                )

        if action_filter:
            query = query.filter(AuditLog.action == action_filter)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(AuditLog.timestamp >= from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(AuditLog.timestamp <= to_date)
            except ValueError:
                pass

        if status_filter:
            success = status_filter == 'success'
            query = query.filter(AuditLog.success == success)

        # Get total count before pagination
        total = query.count()

        # Apply pagination
        logs = query.order_by(AuditLog.timestamp.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        # Format response using the model's to_dict method
        logs_data = [log.to_dict() for log in logs.items]

        return jsonify({
            'logs': logs_data,
            'total': total,
            'page': page,
            'pages': logs.pages,
            'per_page': per_page
        }), 200

    except Exception as e:
        print(f"Error fetching audit logs: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch audit logs'}), 500

@admin.route('/export-logs', methods=['GET'])
@jwt_required()
def export_logs():
    """Export audit logs in CSV or JSON format"""
    try:
        format_type = request.args.get('format', 'csv')
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        status_filter = request.args.get('status', '')

        
        query = AuditLog.query

        e
        if user_filter:
            try:
                user_id = int(user_filter)
                query = query.filter(AuditLog.user_id == user_id)
            except ValueError:
                query = query.join(User).filter(
                    User.full_name.ilike(f'%{user_filter}%')
                )

        if action_filter:
            query = query.filter(AuditLog.action == action_filter)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(AuditLog.timestamp >= from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(AuditLog.timestamp <= to_date)
            except ValueError:
                pass

        if status_filter:
            success = status_filter == 'success'
            query = query.filter(AuditLog.success == success)

        logs = query.order_by(AuditLog.timestamp.desc()).all()

        if format_type == 'json':
            # Use to_dict method for JSON export
            logs_data = [log.to_dict() for log in logs]
            return jsonify(logs_data), 200
        else:
            # CSV format
            import csv
            from io import StringIO
            from flask import make_response

            si = StringIO()
            cw = csv.writer(si)
            cw.writerow(AuditLog.get_csv_headers())

            for log in logs:
                cw.writerow(log.to_csv_row())

            response = make_response(si.getvalue())
            filename = f'audit-logs-{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            response.headers['Content-Disposition'] = f'attachment; filename={filename}'
            response.headers['Content-Type'] = 'text/csv'
            return response

    except Exception as e:
        print(f"Error exporting logs: {str(e)}")
        return jsonify({'error': 'Failed to export logs'}), 500

@admin.route('/recent-audits', methods=['GET'])
@jwt_required()
def get_recent_audits():
    """Get recent audit logs for dashboard"""
    try:
        limit = request.args.get('limit', 5, type=int)

        recent_logs = AuditLog.query.order_by(
            AuditLog.timestamp.desc()
        ).limit(limit).all()

        
        logs_data = []
        for log in recent_logs:
            user = User.query.get(log.user_id) if log.user_id else None
            logs_data.append({
                'id': log.id,
                'action': log.action,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                'user': {
                    'full_name': user.full_name if user else f"User #{log.user_id}"
                } if log.user_id else None,
                'ip_address': log.ip_address,
                'success': log.success
            })

        return jsonify(logs_data), 200
    except Exception as e:
        print(f"Error fetching recent audits: {str(e)}")
        return jsonify([]), 200

# System status route
@admin.route('/system-status', methods=['GET'])
@jwt_required()
def get_system_status():
    """Get system status"""
    return jsonify({
        'database': 'Connected',
        'db_type': 'SQLite',
        'db_location': 'instance/medipredict.db',
        'ml_status': 'Loaded',
        'ml_model': 'Drug Recommendation',
        'ml_version': '1.0.0'
    }), 200

# User details route
@admin.route('/user-details/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_details(user_id):
    """Get user details by ID"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'role': user.role,
            'is_verified': user.is_verified,
            'is_active': user.is_active, 
            'created_at': user.created_at.isoformat() if user.created_at else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Settings route
@admin.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get system settings"""
    return jsonify({
        'app_name': 'MediPredict CDSS',
        'version': '1.0.0',
        'maintenance_mode': False,
        'allow_registrations': True
    }), 200

# Verify user endpoint
@admin.route('/verify-user/<int:user_id>', methods=['POST'])
@jwt_required()
def verify_user(user_id):
    """Verify a pending user and change role to clinician"""
    try:
        # Get current user from token for logging
        current_user_id = get_jwt_identity()
        admin_user = User.query.get(int(current_user_id))

        print(f"🔍 Admin {current_user_id} verifying user {user_id}")

        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        
        if user.role != 'pending':
            return jsonify({'error': f'User is not pending (current role: {user.role})'}), 400

        
        user.role = 'clinician'
        user.is_verified = True
        user.is_active = True  
        user.verified_at = datetime.utcnow()
        user.verified_by = current_user_id

        
        db.session.commit()

        
        log_audit(
            user_id=current_user_id,
            action=AuditActions.USER_VERIFIED,
            resource_type='User',
            resource_id=user_id,
            success=True,
            details=f"User {user.email} verified by admin {admin_user.email if admin_user else current_user_id}"
        )

        print(f"User {user_id} verified successfully")

        return jsonify({
            'message': 'User verified successfully',
            'user': {
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'is_verified': user.is_verified,
                'is_active': user.is_active
            }
        }), 200

    except Exception as e:
        print(f"Error verifying user: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Reject user endpoint
@admin.route('/reject-user/<int:user_id>', methods=['POST'])
@jwt_required()
def reject_user(user_id):
    """Reject a pending user"""
    try:
        current_user_id = get_jwt_identity()
        admin_user = User.query.get(int(current_user_id))

        print(f" Admin {current_user_id} rejecting user {user_id}")

        # Find the user to reject
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check if user is pending
        if user.role != 'pending':
            return jsonify({'error': f'User is not pending (current role: {user.role})'}), 400

        # Log before deletion
        log_audit(
            user_id=current_user_id,
            action=AuditActions.USER_REJECTED,
            resource_type='User',
            resource_id=user_id,
            success=True,
            details=f"User {user.email} rejected by admin {admin_user.email if admin_user else current_user_id}"
        )

        # Delete the user
        db.session.delete(user)
        db.session.commit()

        print(f"✅ User {user_id} rejected and deleted successfully")

        return jsonify({'message': 'User rejected successfully'}), 200

    except Exception as e:
        print(f" Error rejecting user: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
@admin.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user info"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        # Get user statistics
        patients_count = 0
        assessments_count = 0
        
        # If user is clinician, get their patients and assessments
        if user.role == 'clinician':
            patients_count = len(user.patients_registered) if hasattr(user, 'patients_registered') else 0
            assessments_count = len(user.assessments_performed) if hasattr(user, 'assessments_performed') else 0
        
        # For admin, you might want different stats
        if user.role == 'admin':
            patients_count = 0  # Or total patients in system
            assessments_count = 0  # Or total assessments in system
        
        return jsonify({
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'role': user.role,
            'specialization': user.specialization or 'Not specified',
            'license_number': user.license_number or 'Not specified',
            'institution': user.institution or 'Not specified',
            'is_verified': user.is_verified,
            'is_active': user.is_active,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
            'patients_count': patients_count,
            'assessments_count': assessments_count
        }), 200
    except Exception as e:
        print(f"Error in get_current_user: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

# Stats route
@admin.route('/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        total_users = User.query.count()
        pending_count = User.query.filter_by(role='pending').count()
        active_count = User.query.filter_by(is_verified=True).count()
        audit_count = AuditLog.query.count()

        return jsonify({
            'total_users': total_users,
            'pending_count': pending_count,
            'active_count': active_count,
            'audit_count': audit_count,
            'recent_audits': []
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500