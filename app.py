from flask import Flask, request, jsonify, render_template
from main import SelmaAI

app = Flask(__name__)
selma = SelmaAI()

def format_response_paragraphs(text):
    # Split by double newlines or single newlines, wrap each in <p>
    paragraphs = [f"<p>{p.strip()}</p>" for p in text.split('\n\n') if p.strip()]
    return "".join(paragraphs) if paragraphs else text

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    message = request.json.get("message")
    response, end = selma.generate_response(message)
    # Format response for HTML display
    response = format_response_paragraphs(response)
    return jsonify({"response": response, "end": end})

if __name__ == "__main__":
    app.run(debug=True)