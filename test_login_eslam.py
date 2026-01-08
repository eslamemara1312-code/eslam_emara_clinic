import requests


def test_login_eslam():
    url = "http://localhost:8001/token"

    payload = {"username": "eslam", "password": "1111", "grant_type": "password"}

    try:
        print(f"Testing Login for: {payload['username']}...")
        response = requests.post(url, data=payload)

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            print("LOGIN SUCCESS! Token received.")
        else:
            print("LOGIN FAILED!")

    except Exception as e:
        print(f"Connection Error: {e}")


if __name__ == "__main__":
    test_login_eslam()
