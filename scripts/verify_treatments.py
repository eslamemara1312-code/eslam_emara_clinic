import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8000"

def request(method, endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if data:
        data_bytes = json.dumps(data).encode('utf-8')
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status not in [200, 201]: # 201 for created
                print(f"FAILED: {method} {endpoint} - Status {response.status}")
                # Try to read error body
                print(response.read().decode('utf-8'))
                sys.exit(1)
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"FAILED: {method} {endpoint} - {e}")
        print(e.read().decode('utf-8'))
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

def test_treatments():
    print("Testing Treatments API with Advanced Details...")

    # 0. Ensure patient exists (using ID 1 for simplicity, assuming seeded or exists)
    # If not, create one
    try:
        users = request("GET", "/patients/")
        if len(users) > 0:
            patient_id = users[0]['id']
            print(f"Using existing patient ID: {patient_id}")
        else:
            print("Creating temp patient...")
            p_payload = {"name": "Test Patient", "age": 30, "phone": "01000000000"}
            p_res = request("POST", "/patients/", p_payload)
            patient_id = p_res['id']
            print(f"Created patient ID: {patient_id}")
    except Exception as e:
        print(f"Error getting/creating patient: {e}")
        return

    # 1. Create Treatment with Advanced Details
    payload = {
        "patient_id": patient_id,
        "diagnosis": "Root Canal",
        "procedure": "Endo",
        "cost": 1500.0,
        "tooth_number": 14,
        "canal_count": 3,
        "canal_lengths": "MB: 20mm, DB: 21mm, P: 22mm",
        "sessions": "Session 1: Cleaning\nSession 2: Obturation",
        "complications": "None",
        "notes": "Patient tolerant"
    }

    print("Creating treatment...")
    response = request("POST", "/treatments/", payload)
    treatment_id = response["id"]
    print(f"SUCCESS: Created treatment {treatment_id}")

    # 2. Verify Details
    print("Verifying details...")
    # Get treatments for patient
    # FIX: Endpoint is /patients/{id}/treatments
    treatments = request("GET", f"/patients/{patient_id}/treatments")
    
    # Filter for our specific treatment
    my_treatment = next((t for t in treatments if t["id"] == treatment_id), None)
    
    if not my_treatment:
        print("FAILED: Treatment not found in patient list")
        sys.exit(1)
        
    # Check fields
    errors = []
    if my_treatment.get("canal_count") != 3: errors.append(f"Bad canal_count: {my_treatment.get('canal_count')}")
    if my_treatment.get("canal_lengths") != "MB: 20mm, DB: 21mm, P: 22mm": errors.append(f"Bad canal_lengths: {my_treatment.get('canal_lengths')}")
    if "Session 1" not in my_treatment.get("sessions", ""): errors.append(f"Bad sessions: {my_treatment.get('sessions')}")
    
    if errors:
        print("FAILED: Data mismatch")
        for e in errors: print(f"  - {e}")
        sys.exit(1)
        
    print("SUCCESS: Data verified correctly.")

    # 3. Cleanup
    print("Cleaning up...")
    request("DELETE", f"/treatments/{treatment_id}")
    print("SUCCESS: Deleted treatment")

    print("\nALL TESTS PASSED")

if __name__ == "__main__":
    test_treatments()
