import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

# Initialize the OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def parse_syllabus_to_json(raw_text):
    system_prompt = """
    You are an expert academic assistant. Your job is to parse the following raw text from a college course syllabus and extract all graded items, exams, assignments, and milestones.

    You must return a valid JSON object matching this schema exactly:
    {
      "course_name": "String",
      "schedule": [
        {
          "title": "String (e.g., Midterm 1, Homework 3)",
          "type": "String (exam, assignment, project, quiz)",
          "due_date": "YYYY-MM-DD (Infer year based on current context if missing)",
          "weight": "Percentage integer or null if unknown",
          "priority": "String (Must be exactly 'High', 'Medium', or 'Low' based on importance/weight)"
        }
      ]
    }
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" }, # Forces the model to output valid JSON
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the raw syllabus text:\n\n{raw_text}"}
            ]
        )
        
        # Convert the string response back into a Python dictionary
        parsed_data = json.loads(response.choices[0].message.content)
        return parsed_data
        
    except Exception as e:
        print(f"LLM Parsing Error: {e}")
        return None

def generate_custom_study_plan(course_name, task_title, due_date):
    system_prompt = """
    You are an expert academic coach. The user will provide a course name, an assignment/exam title, and a due date.
    Your job is to generate a concise, highly actionable study plan. 
    Use principles like Active Recall and Spaced Repetition. 
    Format the output cleanly using bullet points. Keep it under 150 words.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Course: {course_name}\nTask: {task_title}\nDue Date: {due_date}"}
            ]
        )
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"LLM Study Plan Error: {e}")
        return "Failed to generate study plan. Please try again."