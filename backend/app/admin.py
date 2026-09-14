from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app import db
from sqlalchemy import or_
import traceback

bp = Blueprint('admin', __name__)

# GET endpoint for user details - FIX THIS
@bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_details(user_id):
    """Get detailed user information for admin view"""
    try:
        print("="*50)
        print(f"GET USER DETAILS - User ID: {user_id}")
        
        # Get current user from token
        current_user_id = get_jwt_identity()
        print(f"Current user ID: {current_user_id}")
        
        # Get current user from database
        current_user = User.query.get(int(current_user_id))
        if not current_user:
            return jsonify({'message': 'Current user not found'}), 404
        
        print(f"Current user role: {current_user.role}")
        
        # Check if current user is admin
        if current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admin access required'}), 403
        
        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        print(f"Target user found: {target_user.email}")
        
        # Get verifier info if available
        verifier = None
        if target_user.verified_by:
            verifier = User.query.get(target_user.verified_by)
        
        # Return user details
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
                'is_locked': getattr(target_user, 'is_locked', False),
                'locked_until': getattr(target_user, 'locked_until', None),
                'created_at': target_user.created_at.isoformat() if target_user.created_at else None,
                'last_login_at': target_user.last_login_at.isoformat() if target_user.last_login_at else None,
                'last_login_ip': getattr(target_user, 'last_login_ip', None),
                'failed_login_attempts': getattr(target_user, 'failed_login_attempts', 0),
                'verified_at': target_user.verified_at.isoformat() if target_user.verified_at else None,
                'verified_by': target_user.verified_by
            },
            'verifier': {
                'id': verifier.id,
                'full_name': verifier.full_name
            } if verifier else None,
            'recent_logs': []  # You can add audit logs here if needed
        }), 200
        
    except Exception as e:
        print(f"ERROR in get_user_details: {str(e)}")
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@bp.route('/users/<int:user_id>/change-role', methods=['POST'])
@jwt_required()
def change_user_role(user_id):
    """Change a user's role"""
    try:
        print("CHANGE ROLE - START")
        
        # Get current user
        current_user_id = get_jwt_identity()
        data = request.get_json()
        new_role = data.get('role')
        
        print(f"Current user: {current_user_id}, New role: {new_role}, Target user: {user_id}")
        
        # Validate new role
        valid_roles = ['clinician', 'supervisor', 'auditor', 'admin']
        if new_role not in valid_roles:
            return jsonify({'message': f'Invalid role'}), 400
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Prevent changing own role or admin role
        if target_user.id == int(current_user_id):
            return jsonify({'message': 'Cannot change your own role'}), 400
        if target_user.role == 'admin':
            return jsonify({'message': 'Cannot change admin role'}), 400
        
        # Update role
        old_role = target_user.role
        target_user.role = new_role
        
        db.session.commit()
        print(f"Role changed from {old_role} to {new_role}")
        
        return jsonify({
            'message': f'Role changed successfully',
            'role': new_role
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@jwt_required()
def toggle_user_status(user_id):
    """Activate or deactivate a user account"""
    try:
        print("TOGGLE STATUS - START")
        
        current_user_id = get_jwt_identity()
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Prevent deactivating self or other admins
        if target_user.id == int(current_user_id):
            return jsonify({'message': 'Cannot deactivate yourself'}), 400
        if target_user.role == 'admin':
            return jsonify({'message': 'Cannot deactivate admin'}), 400
        
        # Toggle status
        target_user.is_active = not target_user.is_active
        db.session.commit()
        
        status = 'activated' if target_user.is_active else 'deactivated'
        print(f"User {status}")
        
        return jsonify({
            'message': f'User {status} successfully',
            'is_active': target_user.is_active
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
def reset_user_password(user_id):
    """Reset a user's password"""
    try:
        print("RESET PASSWORD - START")
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        new_password = data.get('new_password')
        
        # Check if current user is admin
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        
        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'message': 'User not found'}), 404
        
        # Update password
        target_user.set_password(new_password)
        
        # Clear any lock if exists
        if hasattr(target_user, 'is_locked') and target_user.is_locked:
            target_user.is_locked = False
            target_user.locked_until = None
        
        db.session.commit()
        
        return jsonify({
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@bp.route('/users/bulk-activate', methods=['POST'])
@jwt_required()
def bulk_activate_users():
    """Activate multiple users at once"""
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
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user and user.role != 'admin' and user.id != int(current_user_id):
                if not user.is_active:
                    user.is_active = True
                    activated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'{activated_count} user(s) activated successfully',
            'activated_count': activated_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error activating users: {str(e)}'}), 500

@bp.route('/verified-users', methods=['GET'])
@jwt_required()
def get_verified_users():
    """Get paginated list of verified users"""
    try:
        current_user_id = get_jwt_identity()
        
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = 10
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        status_filter = request.args.get('status', '')
        
        query = User.query.filter(User.is_verified == True)
        
        if search:
            query = query.filter(
                or_(
                    User.full_name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%'),
                    User.license_number.ilike(f'%{search}%')
                )
            )
        
        if role_filter:
            query = query.filter(User.role == role_filter)
        
        if status_filter == 'active':
            query = query.filter(User.is_active == True)
        elif status_filter == 'inactive':
            query = query.filter(User.is_active == False)
        
        total = query.count()
        paginated = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        users = []
        for user in paginated.items:
            users.append({
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'license_number': user.license_number or '',
                'institution': user.institution or '',
                'is_active': user.is_active,
                'is_verified': user.is_verified,
            })
        
        return jsonify({
            'users': users,
            'page': page,
            'pages': paginated.pages,
            'total': total
        }), 200
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({'message': str(e)}), 500

@bp.route('/pending-count', methods=['GET'])
@jwt_required()
def get_pending_count():
    """Get count of pending verification requests"""
    try:
        current_user_id = get_jwt_identity()
        
        current_user = User.query.get(int(current_user_id))
        if not current_user or current_user.role != 'admin':
            return jsonify({'message': 'Unauthorized'}), 403
        
        count = User.query.filter_by(is_verified=False).count()
        
        return jsonify({'count': count}), 200
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return jsonify({'message': str(e)}), 500
