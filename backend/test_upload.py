import requests

url = 'http://127.0.0.1:5000/api/upload'
file_path = 'sample.pdf' 

try:
    with open(file_path, 'rb') as f:
        files = {'file': f}
        print(f"Sending {file_path} to the server...")
        response = requests.post(url, files=files)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            # We are expecting a file now, so we write the raw bytes to a new .ics file
            output_filename = 'my_study_plan.ics'
            with open(output_filename, 'wb') as out_file:
                out_file.write(response.content)
            print(f"Success! Calendar saved as {output_filename} in your backend folder.")
        else:
            print("Server returned an error:")
            print(response.text)
            
except FileNotFoundError:
    print(f"Error: Could not find '{file_path}'.")
except Exception as e:
    print(f"An error occurred: {e}")