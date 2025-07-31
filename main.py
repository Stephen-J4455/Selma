import random
import re
import os
from huggingface_hub import InferenceClient

class SelmaAI:
    def __init__(self):
        # Basic patterns: greetings and hugging face mode
        self.patterns = [
            (re.compile(r"\b(who are you|who are u)\b", re.I),[
                "I am Selma, a SMART ENTITY for LEARNING, MANAGEMENT and ASSISTANCE, a Ghanaian startup headquartered in The University of Professional Studies Accra."
            ]),
            (re.compile(r"\b(who created you|who created u)\b", re.I),[
                "I was developed by Stephen J. Amuzu, a Ghanaian software engineer and entrepreneur, as part of a project to create an AI assistant for learning and management."
            ])
        ]
        # Hugging Face client
        hf_token = os.environ.get("HF_TOKEN")
        self.hf_client = InferenceClient(token=hf_token) if hf_token else None

    def ask_huggingface(self, prompt):
        if not self.hf_client:
            return "Hugging Face API is not configured."
        try:
            response = self.hf_client.chat.completions.create(
                model="deepseek-ai/DeepSeek-R1-0528",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096 # User requested very high output length
            )
            content = response.choices[0].message.content
            print(f"[DEBUG] Hugging Face response length: {len(content) if content else 0}")
            if content and len(content) < 3500:
                print("[DEBUG] Response may be incomplete or truncated:", content)
            return content
        except Exception as e:
            print(f"[DEBUG] Hugging Face API error: {e}")
            return f"Error with Hugging Face API: {e}"


    def ask_quen2coder(self, prompt):
        if not self.hf_client:
            return "Hugging Face API is not configured."
        try:
            all_content = ""
            last_content = ""
            max_loops = 5  # Avoid infinite loops
            for i in range(max_loops):
                if i == 0:
                    messages = [{"role": "user", "content": prompt}]
                else:
                    # Ask to continue from last output
                    messages = [
                        {"role": "user", "content": prompt},
                        {"role": "assistant", "content": last_content},
                        {"role": "user", "content": "Continue from where you stopped. Only output code, no explanation."}
                    ]
                response = self.hf_client.chat.completions.create(
                    model="Qwen/Qwen3-235B-A22B-Thinking-2507",
                    messages=messages,
                    max_tokens=4096
                )
                content = response.choices[0].message.content
                print(f"[DEBUG] Quen2Coder response length (part {i+1}): {len(content) if content else 0}")
                all_content += ("\n" if all_content else "") + (content or "")
                last_content = content or ""
                # Heuristic: if response is much shorter than max_tokens, assume it's done
                if not content or len(content) < 3500:
                    break
            return all_content
        except Exception as e:
            print(f"[DEBUG] Quen2Coder API error: {e}")
            return f"Error with Quen2Coder API: {e}"

    def generate_response(self, user_input):
        for pattern, responses in self.patterns:
            if pattern.search(user_input):
                return random.choice(responses), pattern.pattern.startswith(r"\b(bye")
        # Fallback to Hugging Face model
        hf_response = self.ask_huggingface(user_input)
        return hf_response, False

    def generate_code(self, user_input):
        # Use Quen2Coder model for code generation
        return self.ask_quen2coder(user_input)

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