import whisper

# Load the Whisper small model on CPU
model = whisper.load_model("small", device="cpu")

# Transcribe audio and translate to English
result = model.transcribe("audio.wav", task="translate", language="en")

print("Transcribed Text in English:")
print(result["text"])
