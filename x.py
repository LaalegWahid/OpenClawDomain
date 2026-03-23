from google import genai
import os

# Initialize client (ensure GEMINI_API_KEY environment variable is set)
client = genai.Client(api_key="AIzaSyA73haqFzdRtBfiQy76rXYhwem5NndFWRQ")

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Is this API key working?"
)

print(response.text)