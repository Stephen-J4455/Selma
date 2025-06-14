import random
import re
from huggingface_hub import InferenceClient

class SelmaAI:
    def __init__(self):
        # Basic patterns: greetings and hugging face mode
        self.patterns = [
            (re.compile(r"\b(who are you|who are u)\b", re.I),[
                "I an Selma, a SMART ENTITY for LEARNING, MANAGEMENT and ASSISTANCE, a Ghanaian startup headquartered in The University of Professional Studies Accra."
            ]),
            (re.compile(r"\b(who created you|who created u)\b", re.I),[
                "I was developed by Stephen J. Amuzu, a Ghanaian software engineer and enterpreneur, as part of a project to create an AI assistant for learning and management."
            ])
        ]
        # Hugging Face client
        hf_token = "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"
        self.hf_client = InferenceClient(token=hf_token) if hf_token else None

    def ask_huggingface(self, prompt):
        if not self.hf_client:
            return "Hugging Face API is not configured."
        try:
            response = self.hf_client.chat.completions.create(
                model="mistralai/Magistral-Small-2506",
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error with Hugging Face API: {e}"

    def generate_response(self, user_input):
        for pattern, responses in self.patterns:
            if pattern.search(user_input):
                return random.choice(responses), pattern.pattern.startswith(r"\b(bye")
        # Fallback to Hugging Face model
        hf_response = self.ask_huggingface(user_input)
        return hf_response, False

    def chat(self):
        print("SELMA: Hi! I'm your personal chat assistant. What would you like to do?")
        while True:
            try:
                user_input = input("You: ").strip()
                if not user_input:
                    continue
                response, should_exit = self.generate_response(user_input)
                print(f"SELMA: {response}")
                if should_exit:
                    break
            except KeyboardInterrupt:
                print("\nSELMA: Goodbye!")
                break
            except Exception as e:
                print(f"SELMA: Oops! Error: {e}")

if __name__ == "__main__":
    bot = SelmaAI()
    bot.chat()