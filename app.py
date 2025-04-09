from flask import Flask, render_template, request, jsonify, send_file
from database import db, WorkSession
from datetime import datetime, timedelta
import os
import pandas as pd
from io import BytesIO
import csv
from waitress import serve
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get database URL from environment variable or use default
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///cil_tracker.db')
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Get host and port from environment variables
HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', '8000'))

db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

# Configuration for line-leg-machine relationships
LINE_CONFIG = {
    'Star 1': {
        'legs': ['Leg 1', 'Leg 2', 'Leg 3', 'Leg 4', 'Leg 5', 'Leg 6'],
        'machines': ['HRM', 'TTM']
    },
    'Star 2': {
        'legs': ['Leg 1', 'Leg 2', 'Leg 3', 'Leg 4', 'Leg 5', 'Leg 6', 'Leg 7'],
        'machines': ['HRM', 'TTM']
    },
    'Star 3': {
        'legs': ['Leg 1', 'Leg 2', 'Leg 3'],
        'machines': ['HRM', 'TTM']
    },
    'Star 5': {
        'legs': ['Leg 1', 'Leg 2', 'Leg 3', 'Leg 4'],
        'machines': ['HRM', 'TTM']
    },
    'Star 6': {
        'legs': ['Leg 1', 'Leg 2', 'Leg 3'],
        'machines': ['JTA', 'TFR']
    }
}

@app.route('/')
def index():
    return render_template('index.html', line_config=LINE_CONFIG)

@app.route('/api/start_session', methods=['POST'])
def start_session():
    data = request.json
    session = WorkSession(
        line=data['line'],
        leg=data['leg'],
        machine=data['machine'],
        start_time=datetime.now()
    )
    db.session.add(session)
    db.session.commit()
    return jsonify({'session_id': session.id})

@app.route('/api/stop_session', methods=['POST'])
def stop_session():
    data = request.json
    session = WorkSession.query.get(data['session_id'])
    if session:
        session.end_time = datetime.now()
        session.duration = int((session.end_time - session.start_time).total_seconds())
        db.session.commit()
        return jsonify(session.to_dict())
    return jsonify({'error': 'Session not found'}), 404

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    sessions = WorkSession.query.order_by(WorkSession.start_time.desc()).all()
    return jsonify([session.to_dict() for session in sessions])

def format_duration(seconds):
    """Format duration as MM:SS"""
    if seconds is None:
        return '-'
    total_minutes = seconds // 60
    remaining_seconds = seconds % 60
    return f"{total_minutes:02d}:{remaining_seconds:02d}"

@app.route('/api/export', methods=['POST'])
def export_data():
    try:
        data = request.json
        if not data or 'start_date' not in data or 'end_date' not in data:
            print("Missing required date parameters")
            return jsonify({'error': 'Missing required date parameters'}), 400

        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d')
        except ValueError as e:
            print(f"Invalid date format: {str(e)}")
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        export_format = data.get('format', 'excel')
        
        try:
            sessions = WorkSession.get_sessions_for_export(start_date, end_date)
            print(f"Found {len(sessions)} sessions for export")
        except Exception as e:
            print(f"Database query error: {str(e)}")
            return jsonify({'error': 'Failed to retrieve data from database'}), 500
        
        if not sessions:
            print(f"No data found between {start_date} and {end_date}")
            return jsonify({'error': 'No completed sessions found for the selected date range'}), 404
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame([{
                'line': session.line,
                'leg': session.leg,
                'machine': session.machine,
                'start_time': session.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'end_time': session.end_time.strftime('%Y-%m-%d %H:%M:%S') if session.end_time else '-',
                'duration': format_duration(session.duration)
            } for session in sessions])
            
            # Reorder columns for better readability
            columns_order = ['line', 'leg', 'machine', 'start_time', 'end_time', 'duration']
            df = df[columns_order]
            
            if export_format == 'excel':
                try:
                    output = BytesIO()
                    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                        df.to_excel(writer, sheet_name='CIL Sessions', index=False)
                        
                        workbook = writer.book
                        worksheet = writer.sheets['CIL Sessions']
                        
                        # Add formats
                        header_format = workbook.add_format({
                            'bold': True,
                            'bg_color': '#663399',
                            'font_color': 'white',
                            'border': 1
                        })
                        
                        # Format the header
                        for col_num, value in enumerate(df.columns.values):
                            worksheet.write(0, col_num, value, header_format)
                            
                        # Auto-adjust columns width
                        for idx, col in enumerate(df):
                            max_length = max(
                                df[col].astype(str).apply(len).max(),
                                len(str(col))
                            )
                            worksheet.set_column(idx, idx, max_length + 2)
                    
                    output.seek(0)
                    return send_file(
                        output,
                        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        as_attachment=True,
                        download_name=f'cil_sessions_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.xlsx'
                    )
                except Exception as e:
                    print(f"Excel export error: {str(e)}")
                    export_format = 'csv'
            
            if export_format == 'csv':
                try:
                    output = BytesIO()
                    df.to_csv(output, index=False, encoding='utf-8')
                    output.seek(0)
                    return send_file(
                        output,
                        mimetype='text/csv',
                        as_attachment=True,
                        download_name=f'cil_sessions_{start_date.strftime("%Y%m%d")}_{end_date.strftime("%Y%m%d")}.csv'
                    )
                except Exception as e:
                    print(f"CSV export error: {str(e)}")
                    return jsonify({'error': 'Failed to create CSV file'}), 500
                    
        except Exception as e:
            print(f"Data processing error: {str(e)}")
            return jsonify({'error': 'Failed to process data for export'}), 500
                
    except Exception as e:
        print(f"General export error: {str(e)}")
        return jsonify({'error': 'Failed to export data'}), 500

@app.before_request
def cleanup_old_data():
    """Clean up data older than 30 days before each request"""
    WorkSession.cleanup_old_data(retention_days=30)

if __name__ == '__main__':
    print(f"Starting CIL Tracker on {HOST}:{PORT}")
    print(f"Database path: {DATABASE_URL}")
    if os.environ.get('FLASK_ENV') == 'development':
        app.run(host=HOST, port=PORT, debug=True)
    else:
        serve(app, host=HOST, port=PORT, threads=4) 