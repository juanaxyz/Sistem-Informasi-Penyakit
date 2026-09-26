import requests

response = requests.post(
    "http://localhost:8000/api/rag/chat", json={"question": "Apa saja gejala TBC?"}
)

print(response.status_code)
print(response.json())
