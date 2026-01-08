import requests


def test_login():
    url = "http://localhost:8001/token"

    # Test Super Admin
    payload = {
        "username": "eslamemara1312@gmail.com",
        "password": "ESLAMomara11##",
        "grant_type": "password",  # Required by OAuth2PasswordRequestForm
    }

    try:
        print(f"Testing Login for: {payload['username']}...")
        response = requests.post(
            url, data=payload
        )  # NOTE: OAuth2 uses form data, not JSON!

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            print("LOGIN SUCCESS! Token received.")
        else:
            print("LOGIN FAILED!")

    except Exception as e:
        print(f"Connection Error: {e}")


if __name__ == "__main__":
    test_login()
