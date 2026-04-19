from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import pymysql
import pymysql.cursors
import hashlib
import os
from datetime import datetime, date, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = 'freakofitgym_secret_2025'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

# MySQL Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'gym_db',
    'cursorclass': pymysql.cursors.DictCursor
}

# ─── Database Setup ───────────────────────────────────────────────────────────
def get_db():
    return pymysql.connect(**DB_CONFIG)

def get_server_connection():
    server_config = DB_CONFIG.copy()
    server_config.pop('database', None)
    return pymysql.connect(**server_config)

def get_request_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}

def init_db():
    conn = get_server_connection()
    cur = conn.cursor()
    cur.execute("CREATE DATABASE IF NOT EXISTS gym_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.commit()
    conn.close()

    conn = get_db()
    cur = conn.cursor()

    cur.execute('''CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    cur.execute('''CREATE TABLE IF NOT EXISTS appointments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        service VARCHAR(255) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_appointment (email, appointment_date, appointment_time)
    )''')

    cur.execute('''CREATE TABLE IF NOT EXISTS members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        plan VARCHAR(255),
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    cur.execute('''CREATE TABLE IF NOT EXISTS contact_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    # Seed admin account
    admin_pass = hashlib.sha256('admin123'.encode()).hexdigest()
    cur.execute("INSERT IGNORE INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
                ('Admin', 'admin@freakofitgym.com', admin_pass, 'admin'))

    user_pass = hashlib.sha256('user123'.encode()).hexdigest()
    cur.execute("INSERT IGNORE INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
                ('Demo User', 'user@gym.com', user_pass, 'user'))

    # Seed sample appointments
    cur.execute("SELECT COUNT(*) as count FROM appointments")
    if cur.fetchone()['count'] == 0:
        sample_apts = [
            ('Raj Kumar', 'raj@email.com', '9876543210', '2026-04-12', '10:00', 'Personal Training', 'First session', 'confirmed'),
            ('Priya Singh', 'priya@email.com', '9876543211', '2026-04-12', '11:00', 'Yoga Session', '', 'pending'),
            ('Amit Sharma', 'amit@email.com', '9876543212', '2026-04-13', '09:00', 'Cardio Training', 'Wants weight loss program', 'pending'),
            ('Neha Gupta', 'neha@email.com', '9876543213', '2026-04-14', '16:00', 'Nutrition Consultation', '', 'confirmed'),
            ('Rohit Verma', 'rohit@email.com', '9876543214', '2026-04-15', '07:00', 'Strength Training', 'Advanced level', 'cancelled'),
        ]
        for apt in sample_apts:
            cur.execute("INSERT INTO appointments (name, email, phone, appointment_date, appointment_time, service, message, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                        apt)

    conn.commit()
    conn.close()

# ─── Auth Helpers ──────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# ─── Public Routes ─────────────────────────────────────────────────────────────
@app.route('/')
def index():
    is_admin = 'user_id' in session and session.get('role') == 'admin'
    return render_template('index.html', is_admin=is_admin)

@app.route('/gallery')
def gallery():
    return render_template('gallery.html')

@app.route('/appointment')
def appointment():
    return render_template('appointment.html')

@app.route('/login')
def login():
    if 'user_id' in session:
        if session.get('role') == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ─── Admin Routes ──────────────────────────────────────────────────────────────
@app.route('/admin')
@admin_required
def admin_dashboard():
    return render_template('admin_dashboard.html', admin_email=session.get('email'))

@app.route('/admin/members')
@admin_required
def admin_members():
    return redirect(url_for('admin_dashboard'))

# ─── API Auth ─────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def api_login():
    data = get_request_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'})

    hashed = hashlib.sha256(password.encode()).hexdigest()

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email=%s AND password=%s", (email, hashed))
    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'message': 'Invalid email or password'})

    session['user_id'] = user['id']
    session['email'] = user['email']
    session['name'] = user['name']
    session['role'] = user['role']

    redirect_url = '/admin' if user['role'] == 'admin' else '/'
    return jsonify({'success': True, 'role': user['role'], 'redirectUrl': redirect_url})

@app.route('/api/register', methods=['POST'])
def api_register():
    data = get_request_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    phone = data.get('phone', '').strip()

    if not all([name, email, password]):
        return jsonify({'success': False, 'message': 'Name, email, and password are required'})

    hashed = hashlib.sha256(password.encode()).hexdigest()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO users (name, email, password, phone) VALUES (%s,%s,%s,%s)",
                     (name, email, hashed, phone))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Account created! Please login.'})
    except pymysql.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'message': 'Email already registered'})

@app.route('/api/check-auth')
def check_auth():
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'role': session.get('role'),
            'email': session.get('email'),
            'name': session.get('name')
        })
    return jsonify({'authenticated': False})

# ─── Appointment API ───────────────────────────────────────────────────────────
@app.route('/api/appointments', methods=['POST'])
def book_appointment():
    data = get_request_json()
    required = ['name', 'email', 'phone', 'date', 'time', 'service']
    if not data or not all(data.get(f) for f in required):
        return jsonify({'success': False, 'message': 'All required fields must be filled'})

    conn = get_db()
    cur = conn.cursor()
    cur.execute('''INSERT INTO appointments (name, email, phone, appointment_date, appointment_time, service, message)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)''',
                 (data['name'], data['email'], data['phone'], data['date'], data['time'],
                  data['service'], data.get('message', '')))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Appointment booked successfully!'})

def serialize_appointment(appt):
    row = dict(appt)
    for field in ('appointment_date', 'appointment_time', 'created_at'):
        value = row.get(field)
        if isinstance(value, (datetime, date, timedelta)):
            row[field] = str(value)
    return row

@app.route('/api/appointments', methods=['GET'])
@admin_required
def get_appointments():
    status_filter = request.args.get('status', '')
    search = request.args.get('search', '')
    conn = get_db()
    cur = conn.cursor()
    query = "SELECT * FROM appointments WHERE 1=1"
    params = []
    if status_filter:
        query += " AND status=%s"
        params.append(status_filter)
    if search:
        query += " AND (name LIKE %s OR email LIKE %s OR phone LIKE %s)"
        params += [f'%{search}%', f'%{search}%', f'%{search}%']
    query += " ORDER BY created_at DESC"
    cur.execute(query, params)
    apts = cur.fetchall()
    conn.close()
    return jsonify({'success': True, 'appointments': [serialize_appointment(a) for a in apts]})

@app.route('/api/appointments/<int:apt_id>', methods=['PUT'])
@admin_required
def update_appointment(apt_id):
    data = get_request_json()
    status = data.get('status')
    if not status:
        return jsonify({'success': False, 'message': 'Status is required'})
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE appointments SET status=%s WHERE id=%s", (status, apt_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/appointments/<int:apt_id>', methods=['DELETE'])
@admin_required
def delete_appointment(apt_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM appointments WHERE id=%s", (apt_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─── Dashboard Stats API ────────────────────────────────────────────────────────
@app.route('/api/dashboard-stats')
@admin_required
def dashboard_stats():
    conn = get_db()
    cur = conn.cursor()
    today_str = date.today().isoformat()
    cur.execute("SELECT COUNT(*) as count FROM appointments")
    total = cur.fetchone()['count']
    cur.execute("SELECT COUNT(*) as count FROM appointments WHERE status=%s", ('pending',))
    pending = cur.fetchone()['count']
    cur.execute("SELECT COUNT(*) as count FROM appointments WHERE status=%s", ('confirmed',))
    confirmed = cur.fetchone()['count']
    cur.execute("SELECT COUNT(*) as count FROM appointments WHERE status=%s", ('cancelled',))
    cancelled = cur.fetchone()['count']
    cur.execute("SELECT COUNT(*) as count FROM appointments WHERE appointment_date=%s", (today_str,))
    today_count = cur.fetchone()['count']
    cur.execute("SELECT COUNT(*) as count FROM users WHERE role=%s", ('user',))
    total_users = cur.fetchone()['count']

    # Weekly chart data
    cur.execute("""
        SELECT appointment_date, COUNT(*) as count FROM appointments
        WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY appointment_date ORDER BY appointment_date
    """)
    weekly = cur.fetchall()

    # Service breakdown
    cur.execute("""
        SELECT service, COUNT(*) as count FROM appointments
        GROUP BY service ORDER BY count DESC
    """)
    services = cur.fetchall()

    conn.close()
    return jsonify({
        'success': True,
        'stats': {
            'total': total, 'pending': pending, 'confirmed': confirmed,
            'cancelled': cancelled, 'today': today_count, 'total_users': total_users
        },
        'weekly': [{'date': r['appointment_date'], 'count': r['count']} for r in weekly],
        'services': [{'service': r['service'], 'count': r['count']} for r in services]
    })

# ─── Members API ───────────────────────────────────────────────────────────────
@app.route('/api/members', methods=['GET'])
@admin_required
def get_members():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM members ORDER BY created_at DESC")
    members = cur.fetchall()
    conn.close()
    return jsonify({'success': True, 'members': members})

@app.route('/api/messages', methods=['GET'])
@admin_required
def get_messages():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM contact_messages ORDER BY created_at DESC")
    messages = cur.fetchall()
    conn.close()
    return jsonify({'success': True, 'messages': messages})

@app.route('/api/members', methods=['POST'])
@admin_required
def add_member():
    data = get_request_json()
    if not data or not data.get('name') or not data.get('email'):
        return jsonify({'success': False, 'message': 'Name and email are required'})

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('''INSERT INTO members (name, email, phone, plan, start_date, end_date, status)
                        VALUES (%s,%s,%s,%s,%s,%s,%s)''',
                     (data['name'], data['email'], data.get('phone'), data.get('plan'),
                      data.get('start_date'), data.get('end_date'), 'active'))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except pymysql.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'message': 'Email already exists'})

@app.route('/api/members/<int:mid>', methods=['DELETE'])
@admin_required
def delete_member(mid):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM members WHERE id=%s", (mid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─── Contact API ───────────────────────────────────────────────────────────────
@app.route('/api/contact', methods=['POST'])
def contact():
    data = get_request_json()
    if not data or not data.get('name') or not data.get('email') or not data.get('message'):
        return jsonify({'success': False, 'message': 'Name, email, and message are required'})

    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO contact_messages (name, email, subject, message) VALUES (%s,%s,%s,%s)",
                 (data['name'], data['email'], data.get('subject', ''), data['message']))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Message sent successfully!'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
