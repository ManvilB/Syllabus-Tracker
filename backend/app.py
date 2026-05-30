from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
import os
import google_auth_oauthlib.flow
from googleapiclient.discovery import build
from utils.parser import extract_text_from_pdf
from utils.llm import parse_syllabus_to_json
from google.oauth2.credentials import Credentials
from utils.llm import parse_syllabus_to_json, generate_custom_study_plan

app = Flask(__name__)
CORS(app, supports_credentials=True) # supports_credentials is required for session cookies
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-this-to-a-secure-random-key")

# Point to your downloaded credentials file
CLIENT_SECRETS_FILE = "credentials.json"
# The scope must exactly match what you configured in the cloud console
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

# Tell Google's libraries to allow HTTP for local development (do not use in production)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Ensure the uploads directory exists before saving files!
os.makedirs('uploads', exist_ok=True)

@app.route('/api/upload', methods=['POST'])
def upload_syllabus():
    if 'credentials' not in session:
        return jsonify({"error": "User not authenticated with Google"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
        
    file = request.files['file']
    if file and file.filename.endswith('.pdf'):
        filepath = os.path.join('uploads', file.filename)
        file.save(filepath)
        
        try:
            raw_text = extract_text_from_pdf(filepath)
            structured_data = parse_syllabus_to_json(raw_text)
            os.remove(filepath)
            
            # CHANGE: Stop here! Just return the JSON to the frontend for review.
            return jsonify({
                "message": "Syllabus parsed! Please review your dates.",
                "data": structured_data
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# NEW ROUTE: Handles the final push to Google Calendar
@app.route('/api/sync', methods=['POST'])
def sync_calendar():
    if 'credentials' not in session:
        return jsonify({"error": "User not authenticated with Google"}), 401
    
    # Grab the JSON data sent from the React frontend
    structured_data = request.json
    
    if not structured_data:
        return jsonify({"error": "No schedule data provided"}), 400
        
    try:
        # Push the approved dates to Google
        links = add_events_to_google_calendar(structured_data, session['credentials'])
        
        return jsonify({
            "message": f"Successfully synced {len(links)} events to Google Calendar!",
            "links": links
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/plan', methods=['POST'])
def get_study_plan():
    if 'credentials' not in session:
        return jsonify({"error": "User not authenticated with Google"}), 401
    
    data = request.json
    course = data.get('course_name')
    task = data.get('task_title')
    due_date = data.get('due_date')
    
    if not all([course, task, due_date]):
        return jsonify({"error": "Missing task details"}), 400
        
    try:
        plan_text = generate_custom_study_plan(course, task, due_date)
        return jsonify({"plan": plan_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/auth/google')
def auth_google():
    """Step 1: Redirect user to Google's OAuth page."""
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES
    )
    flow.redirect_uri = 'http://localhost:5000/api/auth/callback'
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    
    session['state'] = state
    
    # ADD THIS LINE: Save the PKCE code verifier into the session
    session['code_verifier'] = getattr(flow, 'code_verifier', None)
    
    return redirect(authorization_url)

@app.route('/api/auth/callback')
def auth_callback():
    """Step 2: Handle response from Google and extract credentials token."""
    state = session.get('state')
    
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state
    )
    flow.redirect_uri = 'http://localhost:5000/api/auth/callback'
    
    # ADD THESE LINES: Restore the PKCE code verifier from the session
    code_verifier = session.get('code_verifier')
    if code_verifier:
        flow.code_verifier = code_verifier
    
    authorization_response = request.url
    flow.fetch_token(authorization_response=authorization_response)
    
    credentials = flow.credentials
    # Save credentials into the session dictionary
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    
    # Redirect back to your Next.js frontend home page
    return redirect('http://localhost:3000/?auth=success')

def add_events_to_google_calendar(structured_data, creds_dict):
    creds = Credentials(**creds_dict)
    service = build('calendar', 'v3', credentials=creds)
    
    course_name = structured_data.get("course_name", "Course")
    schedule = structured_data.get("schedule", [])
    
    created_events = []
    
    # NEW: Map our text priorities to Google Calendar Color IDs
    # 11 = Tomato (Red), 5 = Banana (Yellow), 10 = Basil (Green)
    color_mapping = {
        "High": "11",
        "Medium": "5",
        "Low": "10"
    }
    
    for item in schedule:
        title = item.get("title")
        due_date = item.get("due_date")
        # Grab the priority from the JSON, default to Medium if it's missing
        priority = item.get("priority", "Medium") 
        
        if not due_date or not title:
            continue
            
        event_body = {
            'summary': f"{course_name}: {title}",
            'description': f'Priority: {priority}\nAuto-generated deadline track via Syllabus AI Parser.',
            'start': {
                'date': due_date, 
            },
            'end': {
                'date': due_date,
            },
            # NEW: Inject the colorId into the event
            'colorId': color_mapping.get(priority, "5") 
        }
        
        event = service.events().insert(calendarId='primary', body=event_body).execute()
        created_events.append(event.get('htmlLink'))
        
    return created_events
# Make sure this is at the bottom so the server actually starts!
if __name__ == '__main__':
    app.run(debug=True, port=5000)