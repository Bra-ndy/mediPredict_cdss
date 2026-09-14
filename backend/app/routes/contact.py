from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import json

bp = Blueprint('contact', __name__, url_prefix='/contact')

@bp.route('/send', methods=['POST'])
def send_contact_email():
    """Save contact form submission to file (no SMTP required)"""
    try:
        data = request.get_json()
        
        name = data.get('name')
        email = data.get('email')
        subject = data.get('subject')
        message = data.get('message')
        
        if not all([name, email, subject, message]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        import re
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return jsonify({'success': False, 'message': 'Please enter a valid email address'}), 400
        
        # Create logs directory
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        # Prepare message data
        message_data = {
            'id': datetime.now().strftime('%Y%m%d%H%M%S'),
            'timestamp': datetime.now().isoformat(),
            'name': name,
            'email': email,
            'subject': subject,
            'message': message,
            'status': 'unread'
        }
        
        # Save to JSON file
        log_file = os.path.join(log_dir, 'contact_messages.json')
        
        existing_messages = []
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    existing_messages = json.load(f)
            except:
                existing_messages = []
        
        existing_messages.insert(0, message_data)  # Newest first
        existing_messages = existing_messages[:100]  # Keep last 100 messages
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(existing_messages, f, indent=2, ensure_ascii=False)
        
        print(f"📧 New message from {name} <{email}>")
        
        return jsonify({'success': True, 'message': 'Message sent successfully!'}), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/messages', methods=['GET'])
def get_contact_messages():
    """Get all contact messages (admin only)"""
    try:
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
        log_file = os.path.join(log_dir, 'contact_messages.json')
        
        messages = []
        if os.path.exists(log_file):
            with open(log_file, 'r', encoding='utf-8') as f:
                messages = json.load(f)
        
        return jsonify({
            'success': True,
            'messages': messages,
            'count': len(messages)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/messages/<message_id>/mark-read', methods=['POST'])
def mark_message_read(message_id):
    """Mark a message as read (admin only)"""
    try:
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
        log_file = os.path.join(log_dir, 'contact_messages.json')
        
        if os.path.exists(log_file):
            with open(log_file, 'r', encoding='utf-8') as f:
                messages = json.load(f)
            
            for msg in messages:
                if msg['id'] == message_id:
                    msg['status'] = 'read'
                    break
            
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(messages, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500