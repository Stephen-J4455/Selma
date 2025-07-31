from flask import Flask, request, jsonify, render_template
from main import SelmaAI

app = Flask(__name__)
selma = SelmaAI()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    message = request.json.get("message")
    response, end = selma.generate_response(message)
    return jsonify({"response": response, "end": end})

# Endpoint for code editor to use Quen2Coder
@app.route("/codegen", methods=["POST"])
def codegen():
    message = request.json.get("message")
    response = selma.generate_code(message)
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True)