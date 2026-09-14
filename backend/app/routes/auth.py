from flask import Blueprint, request, jsonify, current_app
from app.models import User
from app.models.audit import log_audit, AuditActions, AuditLog
from app.extensions import db, bcrypt  
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import csv
from io import StringIO

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=data.get('email')).first()
        
        # Check if user exists
        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Check if account is locked
        if hasattr(user, 'is_locked') and user.is_locked():
            lock_time = user.locked_until.strftime('%H:%M')
            return jsonify({
                'message': f'Account is locked due to too many failed attempts. Try again after {lock_time}'
            }), 401
        
        # Check password
        if not user.check_password(data.get('password')):
            # Record failed login attempt
            if hasattr(user, 'record_failed_login'):
                user.record_failed_login()
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Reset failed login attempts on successful login
        if hasattr(user, 'reset_failed_login'):
            user.reset_failed_login()
        
        # Update last login info
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = request.remote_addr
        db.session.commit()
        
        # Generate token using Flask-JWT-Extended
        access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=24))
        
        # Return user info (excluding sensitive data)
        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'specialization': user.specialization,
                'license_number': user.license_number,
                'institution': user.institution,
                'is_verified': user.is_verified,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Login failed: {str(e)}'}), 500

@bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['full_name', 'email', 'password', 'license_number']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400

        # Check if user already exists
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'message': 'Email already registered'}), 400

        if User.query.filter_by(license_number=data.get('license_number')).first():
            return jsonify({'message': 'License number already registered'}), 400

        # Create new user
        user = User(
            full_name=data.get('full_name'),
            email=data.get('email'),
            license_number=data.get('license_number'),
            institution=data.get('institution', ''),
            specialization=data.get('specialization', ''),
            professional_id=data.get('professional_id', ''),
            role='pending',  # Requires admin verification
            is_active=False,  # Keep as False until verified
            is_verified=False
        )

        # Set password
        user.set_password(data.get('password'))

        # Save to database
        db.session.add(user)
        db.session.commit()
        
        # Log the account creation
        log_audit(
            user_id=None,  # System action
            action=AuditActions.ACCOUNT_CREATED,
            resource_type='User',
            resource_id=user.id,
            success=True,
            details=f"New user account created: {user.email}"
        )

        return jsonify({
            'message': 'Registration successful! Your account requires administrator verification before you can access the system.',
            'user_id': user.id
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'message': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if user and hasattr(user, 'generate_reset_token'):
            # Generate reset token
            token = user.generate_reset_token()
            
            # Check if in development mode
            import os
            is_development = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == '1'
            
            reset_link = f"http://localhost:3000/reset-password/{token}"
            
            print("="*60)
            print("PASSWORD RESET LINK")
            print("="*60)
            print(f"Reset link: {reset_link}")
            print("="*60)
            
            # In development, return the reset link
            if is_development:
                return jsonify({
                    'message': 'Reset link generated (development mode)',
                    'reset_link': reset_link,
                    'token': token
                }), 200
        
        return jsonify({
            'message': 'If your email exists in our system, you will receive a password reset link shortly.'
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to process request: {str(e)}'}), 500

@bp.route('/validate-reset-token/<token>', methods=['GET'])
def validate_reset_token(token):
    """Validate password reset token"""
    try:
        # Find user with this token
        user = User.query.filter_by(reset_token=token).first()
        
        if not user or not hasattr(user, 'verify_reset_token') or not user.verify_reset_token(token):
            return jsonify({'valid': False, 'message': 'Invalid or expired token'}), 400
        
        return jsonify({'valid': True}), 200
        
    except Exception as e:
        return jsonify({'valid': False, 'message': str(e)}), 500

@bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Reset password using token"""
    try:
        data = request.get_json()
        new_password = data.get('password')
        
        if not new_password or len(new_password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400
        
        # Find user with this token
        user = User.query.filter_by(reset_token=token).first()
        
        if not user or not hasattr(user, 'verify_reset_token') or not user.verify_reset_token(token):
            return jsonify({'message': 'Invalid or expired reset token'}), 400
        
        # Set new password
        user.set_password(new_password)
        
        # Clear reset token
        if hasattr(user, 'clear_reset_token'):
            user.clear_reset_token()
        
        db.session.commit()
        
        return jsonify({'message': 'Password reset successful! You can now login with your new password.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to reset password: {str(e)}'}), 500

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    return jsonify({'message': 'Logout successful'}), 200

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user info"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        return jsonify({
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'specialization': user.specialization,
            'license_number': user.license_number,
            'institution': user.institution,
            'is_verified': user.is_verified,
            'is_active': user.is_active,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@bp.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
def admin_get_user_details(user_id):
    """Get detailed user information for admin view (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get the target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Get verifier info
        verifier = User.query.get(target_user.verified_by) if target_user.verified_by else None
        
        # Handle is_locked properly - it's a method, not a property
        is_locked = False
        locked_until = None
        if hasattr(target_user, 'is_locked') and callable(getattr(target_user, 'is_locked')):
            is_locked = target_user.is_locked()  # Call the method
            if hasattr(target_user, 'locked_until'):
                locked_until = target_user.locked_until
        elif hasattr(target_user, 'is_locked') and not callable(getattr(target_user, 'is_locked')):
            is_locked = target_user.is_locked  # It's a property
        
        # Get failed login attempts
        failed_attempts = getattr(target_user, 'failed_login_attempts', 0)
        if callable(failed_attempts):
            failed_attempts = failed_attempts()
        
        return jsonify({
            'user': {
                'id': target_user.id,
                'full_name': target_user.full_name,
                'email': target_user.email,
                'role': target_user.role,
                'license_number': target_user.license_number or '',
                'institution': target_user.institution or '',
                'specialization': getattr(target_user, 'specialization', ''),
                'professional_id': getattr(target_user, 'professional_id', ''),
                'is_active': target_user.is_active,
                'is_verified': target_user.is_verified,
                'is_locked': is_locked,
                'locked_until': locked_until.isoformat() if locked_until else None,
                'failed_login_attempts': failed_attempts,
                'created_at': target_user.created_at.isoformat() if target_user.created_at else None,
                'last_login_at': target_user.last_login_at.isoformat() if target_user.last_login_at else None,
                'last_login_ip': getattr(target_user, 'last_login_ip', None),
                'verified_at': target_user.verified_at.isoformat() if target_user.verified_at else None,
                'verified_by': target_user.verified_by
            },
            'verifier': {
                'id': verifier.id,
                'full_name': verifier.full_name
            } if verifier else None,
            'recent_logs': []
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error fetching user details: {str(e)}'}), 500

@bp.route('/admin/users/<int:user_id>/toggle-status', methods=['POST'])
@jwt_required()
def admin_toggle_user_status(user_id):
    """Activate or deactivate a user account (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get the target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Prevent deactivating self
        if target_user.id == int(current_user_id):
            return jsonify({'message': 'You cannot deactivate your own account'}), 400
        
        # Prevent deactivating other admins
        if target_user.role == 'admin':
            return jsonify({'message': 'Cannot deactivate other admin accounts'}), 400
        
        # Toggle status
        target_user.is_active = not target_user.is_active
        
        db.session.commit()
        
        status = 'activated' if target_user.is_active else 'deactivated'
        
        # Log the action
        try:
            if hasattr(AuditActions, 'USER_UPDATED'):
                log_audit(
                    user_id=int(current_user_id),
                    action=AuditActions.USER_UPDATED,
                    resource_type='User',
                    resource_id=user_id,
                    success=True,
                    details=f"User {target_user.email} {status} by {current_user.email}"
                )
        except Exception as audit_err:
            print(f"Audit logging failed: {audit_err}")
        
        return jsonify({
            'message': f'User {status} successfully',
            'is_active': target_user.is_active
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error toggling user status: {str(e)}'}), 500

@bp.route('/admin/users/<int:user_id>/change-role', methods=['POST'])
@jwt_required()
def admin_change_user_role(user_id):
    """Change a user's role (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        new_role = data.get('role')
        
        # Validate new role
        valid_roles = ['clinician', 'supervisor', 'auditor', 'admin']
        if new_role not in valid_roles:
            return jsonify({'message': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}), 400
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get the target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Prevent changing own role
        if target_user.id == int(current_user_id):
            return jsonify({'message': 'You cannot change your own role'}), 400
        
        # Prevent changing admin role
        if target_user.role == 'admin':
            return jsonify({'message': 'Cannot change admin user role'}), 400
        
        # Update role
        old_role = target_user.role
        target_user.role = new_role
        db.session.commit()
        
        # Log the action
        try:
            if hasattr(AuditActions, 'USER_UPDATED'):
                log_audit(
                    user_id=int(current_user_id),
                    action=AuditActions.USER_UPDATED,
                    resource_type='User',
                    resource_id=user_id,
                    success=True,
                    details=f"User {target_user.email} role changed from {old_role} to {new_role} by {current_user.email}"
                )
        except Exception as audit_err:
            print(f"Audit logging failed: {audit_err}")
        
        return jsonify({
            'message': f'Role changed from {old_role} to {new_role} successfully',
            'role': new_role
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error changing role: {str(e)}'}), 500

@bp.route('/admin/users/bulk-activate', methods=['POST'])
@jwt_required()
def admin_bulk_activate_users():
    """Activate multiple users at once (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        if not user_ids:
            return jsonify({'message': 'No user IDs provided'}), 400
        
        # Activate all specified users
        activated_count = 0
        activated_users = []
        
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user and user.role != 'admin' and user.id != int(current_user_id):
                if not user.is_active:
                    user.is_active = True
                    activated_count += 1
                    activated_users.append(user.email)
        
        db.session.commit()
        
        # Log the action
        if activated_count > 0:
            try:
                if hasattr(AuditActions, 'USER_UPDATED'):
                    log_audit(
                        user_id=int(current_user_id),
                        action=AuditActions.USER_UPDATED,
                        resource_type='User',
                        resource_id=None,
                        success=True,
                        details=f"Bulk activated {activated_count} users: {', '.join(activated_users)}"
                    )
            except Exception as audit_err:
                print(f"Audit logging failed: {audit_err}")
        
        return jsonify({
            'message': f'{activated_count} user(s) activated successfully',
            'activated_count': activated_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error activating users: {str(e)}'}), 500

@bp.route('/admin/verified-users', methods=['GET'])
@jwt_required()
def admin_get_verified_users():
    """Get paginated list of verified (approved) users (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = 10
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        status_filter = request.args.get('status', '')
        
        # Build query
        query = User.query.filter(User.is_verified == True)
        
        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    User.full_name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.license_number.ilike(f'%{search}%')
                )
            )
        
        # Apply role filter
        if role_filter:
            query = query.filter(User.role == role_filter)
        
        # Apply status filter
        if status_filter == 'active':
            query = query.filter(User.is_active == True)
        elif status_filter == 'inactive':
            query = query.filter(User.is_active == False)
        
        # Get total count
        total = query.count()
        
        # Paginate
        paginated = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        users = []
        for user in paginated.items:
            # Get verifier info
            verifier = User.query.get(user.verified_by) if user.verified_by else None
            
            users.append({
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'license_number': user.license_number,
                'institution': user.institution,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'verified_at': user.verified_at.isoformat() if user.verified_at else None,
                'verified_by': user.verified_by,
                'verifier': {
                    'id': verifier.id,
                    'full_name': verifier.full_name
                } if verifier else None,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None
            })
        
        return jsonify({
            'users': users,
            'page': page,
            'pages': paginated.pages,
            'total': total
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error fetching verified users: {str(e)}'}), 500

@bp.route('/admin/pending-count', methods=['GET'])
@jwt_required()
def admin_get_pending_count():
    """Get count of pending verification requests (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        print(f"🔍 Pending count requested by user ID: {current_user_id}")
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            print(f" User {current_user_id} is not admin")
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Count pending users - use role='pending'
        count = User.query.filter_by(role='pending').count()
        print(f" Pending count query result: {count}")
        
        # Also print all users to see what's in the database
        all_users = User.query.all()
        print(f" All users in database: {len(all_users)}")
        for user in all_users:
            print(f"  - ID: {user.id}, Email: {user.email}, Role: {user.role}, Verified: {user.is_verified}, Active: {user.is_active}")
        
        return jsonify({'count': count}), 200
        
    except Exception as e:
        print(f" Error in admin_get_pending_count: {str(e)}")
        return jsonify({'message': f'Error fetching pending count: {str(e)}'}), 500


@bp.route('/admin/pending-users', methods=['GET'])
@jwt_required()
def admin_get_pending_users():
    """Get list of pending users awaiting verification (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        print(f" Getting pending users - Admin ID: {current_user_id}")
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            print(f" User {current_user_id} is not admin")
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        print(f" User {current_user.email} is admin")
        
        # Get pending users - use role='pending' to match signup
        pending_users = User.query.filter_by(role='pending').all()
        print(f" Found {len(pending_users)} pending users in database")
        
        for user in pending_users:
            print(f"  - User: {user.email}, Role: {user.role}, Verified: {user.is_verified}, Active: {user.is_active}")
        
        users = []
        for user in pending_users:
            users.append({
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'license_number': user.license_number,
                'institution': user.institution,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        print(f" Returning {len(users)} users to frontend")
        return jsonify(users), 200
        
    except Exception as e:
        print(f" Error in admin_get_pending_users: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error fetching pending users: {str(e)}'}), 500

@bp.route('/admin/verify-user/<int:user_id>', methods=['POST'])
@jwt_required()
def admin_verify_user(user_id):
    """Verify a pending user (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Set verification status
        target_user.is_verified = True
        target_user.is_active = True
        # Set default role if it's still 'pending'
        if target_user.role == 'pending':
            target_user.role = 'clinician'
        target_user.verified_by = int(current_user_id)
        target_user.verified_at = datetime.utcnow()
        
        db.session.commit()
        
        # Return the updated user data
        return jsonify({
            'message': 'User verified successfully',
            'user': {
                'id': target_user.id,
                'email': target_user.email,
                'full_name': target_user.full_name,
                'role': target_user.role,
                'is_verified': target_user.is_verified,
                'is_active': target_user.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error verifying user: {str(e)}'}), 500

@bp.route('/admin/reject-user/<int:user_id>', methods=['POST'])
@jwt_required()
def admin_reject_user(user_id):
    """Reject a pending user (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Delete or mark as rejected
        db.session.delete(target_user)
        db.session.commit()
        
        return jsonify({'message': 'User rejected and removed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error rejecting user: {str(e)}'}), 500

@bp.route('/admin/audit-logs', methods=['GET'])
@jwt_required()
def admin_get_audit_logs():
    """Get paginated audit logs (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = 20
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        status_filter = request.args.get('status', '')
        
        # Build query
        query = AuditLog.query
        
        # Apply user filter
        if user_filter:
            # Try to find user by name
            users = User.query.filter(User.full_name.ilike(f'%{user_filter}%')).all()
            user_ids = [u.id for u in users]
            if user_filter.isdigit():
                user_ids.append(int(user_filter))
            if user_ids:
                query = query.filter(AuditLog.user_id.in_(user_ids))
        
        # Apply action filter
        if action_filter:
            query = query.filter(AuditLog.action == action_filter)
        
        # Apply date range filter - using timestamp field
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(AuditLog.timestamp >= from_date)
            except:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date + timedelta(days=1)
                query = query.filter(AuditLog.timestamp <= to_date)
            except:
                pass
        
        # Apply status filter
        if status_filter == 'success':
            query = query.filter(AuditLog.success == True)
        elif status_filter == 'failed':
            query = query.filter(AuditLog.success == False)
        
        # Get total count
        total = query.count()
        
        # Paginate - using timestamp field
        paginated = query.order_by(AuditLog.timestamp.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        logs = []
        for log in paginated.items:
            # Get user info
            user = User.query.get(log.user_id) if log.user_id else None
            
            logs.append({
                'id': log.id,
                'user_id': log.user_id,
                'user': {
                    'id': user.id,
                    'full_name': user.full_name
                } if user else None,
                'action': log.action,
                'resource_type': log.resource_type,
                'resource_id': log.resource_id,
                'details': log.details,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'success': log.success,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None
            })
        
        return jsonify({
            'logs': logs,
            'page': page,
            'pages': paginated.pages,
            'total': total
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error fetching audit logs: {str(e)}'}), 500

@bp.route('/admin/export-logs', methods=['GET'])
@jwt_required()
def admin_export_audit_logs():
    """Export audit logs to CSV or JSON (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get query parameters
        format_type = request.args.get('format', 'csv')
        user_filter = request.args.get('user', '')
        action_filter = request.args.get('action', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        status_filter = request.args.get('status', '')
        
        # Build query
        query = AuditLog.query
        
        # Apply filters (same as above)
        if user_filter:
            users = User.query.filter(User.full_name.ilike(f'%{user_filter}%')).all()
            user_ids = [u.id for u in users]
            if user_filter.isdigit():
                user_ids.append(int(user_filter))
            if user_ids:
                query = query.filter(AuditLog.user_id.in_(user_ids))
        
        if action_filter:
            query = query.filter(AuditLog.action == action_filter)
        
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(AuditLog.timestamp >= from_date)
            except:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date + timedelta(days=1)
                query = query.filter(AuditLog.timestamp <= to_date)
            except:
                pass
        
        if status_filter == 'success':
            query = query.filter(AuditLog.success == True)
        elif status_filter == 'failed':
            query = query.filter(AuditLog.success == False)
        
        logs = query.order_by(AuditLog.timestamp.desc()).all()
        
        # Prepare data for export
        export_data = []
        for log in logs:
            user = User.query.get(log.user_id) if log.user_id else None
            export_data.append({
                'id': log.id,
                'user': user.full_name if user else 'System',
                'user_id': log.user_id,
                'action': log.action,
                'resource_type': log.resource_type,
                'resource_id': log.resource_id,
                'details': log.details,
                'ip_address': log.ip_address,
                'success': log.success,
                'timestamp': log.timestamp.isoformat() if log.timestamp else None
            })
        
        if format_type == 'csv':
            # Generate CSV
            output = StringIO()
            writer = csv.writer(output)
            
            # Write headers
            headers = ['ID', 'User', 'Action', 'Resource Type', 'Resource ID', 'Details', 'IP Address', 'Success', 'Timestamp']
            writer.writerow(headers)
            
            # Write data
            for item in export_data:
                writer.writerow([
                    item['id'],
                    item['user'],
                    item['action'],
                    item['resource_type'],
                    item['resource_id'],
                    item['details'],
                    item['ip_address'],
                    'Yes' if item['success'] else 'No',
                    item['timestamp']
                ])
            
            response = output.getvalue()
            output.close()
            
            return response, 200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=audit-logs.csv'
            }
        
        else:
            # Generate JSON
            return jsonify(export_data), 200, {
                'Content-Disposition': 'attachment; filename=audit-logs.json'
            }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Error exporting logs: {str(e)}'}), 500