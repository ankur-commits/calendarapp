import os
import shutil
import openai

print("--- Environment Check ---")
print(f"OPENAI_API_KEY present: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
print(f"ffmpeg path: {shutil.which('ffmpeg')}")
try:
    from openai import OpenAI
    client = OpenAI()
    print("OpenAI client initialized.")
except Exception as e:
    print(f"OpenAI init failed: {e}")
print("-------------------------")
