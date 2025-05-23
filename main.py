import math
import random
import re
from datetime import datetime
import numpy as np
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client
import wikipedia

try:
    nlp = spacy.load("en_core_web_md")
except OSError:
    print("Medium English model not found, falling back to small model...")
    nlp = spacy.load("en_core_web_sm")

# Supabase Setup
url = "https://sffgznknlmqxtikkyhwu.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZmd6bmtubG1xeHRpa2t5aHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NzE0NzEsImV4cCI6MjA2MjU0NzQ3MX0.vWmG3p7QcjQWsoS1v9mljyXahYKqFqH40Khyb7OT87U"
supabase = None

try:
    supabase = create_client(url, key)
    print("Connected to Database successfully!")
except Exception as e:
    print(f"Error connecting to Database: {e}")
    print("Running in offline mode with limited functionality...")

class SelmaAI:
    def __init__(self):
        self.vectorizer = TfidfVectorizer()
        self.known_patterns = []
        self.known_responses = []
        self.greetings = ["hi", "hello", "hey", "yo", "sup",
                          "good morning", "good afternoon", "good evening"]
        self.agreement = ["yes", "ok", "alright", "got it", "yeah", "yh", "sure", "lets go"]
        self.disagreement = ["no", "nope", "maybe later", "later"]
        self.appreciation = ["thanks", "thank you", "nice", "appreciate"]
        self.me=["selma","sel","selmy"]
        self.context = []
        self.conversation_history = []
        self.basic_patterns()
        self.learning_word = None  # Word SELMA is waiting to learn
        if supabase:
            self.initialize_dictionary_db()

    @staticmethod
    def initialize_dictionary_db():
        try:
            # Check if table exists
            print("Connected to existing dictionary database")
        except Exception as eli:
            print(f"Initializing new dictionary database: {eli}")
            try:
                supabase.table("english_dictionary").insert([
                    {"word": "hello", "definition": "used as a greeting", "part_of_speech": "interjection"},
                    {"word": "time", "definition": "the indefinite continued progress of existence",
                     "part_of_speech": "noun"},
                ]).execute()
                print("Initialized dictionary with sample words")
            except Exception as eli:
                print(f"Failed to initialize dictionary: {eli}")

    @staticmethod
    def get_word_definition(word):
        if not supabase:
            return None

        try:
            result = supabase.table("english_dictionary").select("*").ilike("word", word).execute()
            if result.data:
                return result.data[0]['definition']
        except Exception as eli:
            print(f"Error fetching definition: {eli}")
        return None

    @staticmethod
    def get_from_memory_db(word):
        if not supabase:
            return None
        try:
            result=supabase.table("dict_memory").select("*").ilike("word", word).execute()
            return result.data[0]['definition']
        except Exception as eli:
            print(f"Error reading memory: {eli}")
        return None

    @staticmethod
    def save_word_definition(word, definition):
        if not supabase:
            print("Cannot save word - not connected to database")
            return False

        try:
            supabase.table("dict_memory").insert({
                "word": word.lower(),
                "definition": definition,
                "part_of_speech": "unknown"
            }).execute()
            return True
        except Exception as eli:
            print(f"Error saving word: {eli}")
            return False

    def basic_patterns(self):
        patterns = [
            ("what is your name", ["I am SELMA, your digital assistant!",
                                   "You can call me SELMA!",
                                   "I'm SELMA - here to help!"]),
            ("how are you", ["I'm functioning perfectly, thanks for asking!",
                             "All systems operational!",
                             "I'm just code, but running smoothly!"]),
            ("who are you", ["I'm SELMA (Smart Electronic Learning Machine Assistant)"]),
            ("what can you do", ["I can solve math problems, tell jokes, and chat with you!",
                                 "Math calculations, jokes, and conversation are my specialties!",
                                 "Try asking me to solve a math problem or tell you a joke!"]),
            ("what time is it", [self.get_current_time]),
            ("what is today's date", [self.get_date]),
            ("what day is today", [self.get_day]),
            ("tell me a joke", ["Why was the math book sad? It had too many problems!",
                                "Why don't scientists trust atoms? Because they make up everything!",
                                "Parallel lines have so much in common... it's a shame they'll never meet!"]),
            ("make me laugh", ["Why can't you argue with a calculator? It always has the last word!",
                               "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
                               "Why was the equal sign so humble? It knew it wasn't less than or greater than anyone!"]),
            ("funny", ["How do you stay warm in a cold room? Go to the corner - it's always 90 degrees!",
                       "Why don't calculus majors throw house parties? They know it's bad to drive and derive!",
                       "My love for you is like pi... real, irrational, and never ending!"])
        ]
        for pattern, response in patterns:
            self.known_patterns.append(pattern)
            self.known_responses.append(response)

    @staticmethod
    def solve_math(expression):
        try:
            clean_expr = re.sub(r'[^0-9+\-*/().^%]', '', expression)
            clean_expr = clean_expr.replace('^', '**')
            if '%' in clean_expr:
                parts = clean_expr.split('%')
                if len(parts) == 2:
                    number = float(parts[0])
                    return f"{number}% of {parts[1]} is {number / 100 * float(parts[1])}"

            result = eval(clean_expr, {'__builtins__': None}, {
                'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
                'sqrt': math.sqrt, 'log': math.log, 'pi': math.pi, 'e': math.e
            })
            return f"The answer is {result}"
        except Exception as eli:
            return f"Sorry, I couldn't solve that: {str(eli)}"

    @staticmethod
    def search_wikipedia(query):
        try:
            wikipedia.set_lang("en")
            summary = wikipedia.summary(query)

            # Limit summary to 2000 characters, ending at last complete sentence
            if len(summary) > 2000:
                # Try to find the last full stop before 2000th character
                truncated = summary[:2000]
                last_period = truncated.rfind(".")
                if last_period != -1:
                    truncated = truncated[:last_period + 1]
                return truncated.strip()
            return summary.strip()

        except wikipedia.exceptions.DisambiguationError as eli:
            return f"The topic '{query}' is ambiguous. Please be more specific: {', '.join(eli.options[:5])}..."
        except wikipedia.exceptions.PageError:
            return f"Sorry, I couldn't find anything about '{query}'."
        except Exception as eli:
            return f"An error occurred: {str(eli)}"

    def generate_response(self, user_input):
        normalized_input = user_input.lower().strip()
        # Math
        math_triggers = ["calculate", "solve", "+", "-", "*", "/", "^"]
        if any(trigger in normalized_input for trigger in math_triggers):
            return self.solve_math(normalized_input), False

        # Pattern match
        similar_response = self.find_similar_response(normalized_input)
        if similar_response:
            return similar_response, False

        # Greetings, etc. [existing checks]
        if self.is_greeting(normalized_input):
            return random.choice([
                "Hello there! How can I help?",
                "Hi! What can I do for you today?",
                "Greetings! Ready to Explore?"
            ]), False

        if self.is_me(normalized_input):
            return random.choice(["Yeah...", "At your service "]), False

        if self.is_agreement(normalized_input):
            return random.choice(["Great!", "Understood!", "Let's do it!"]), False

        if self.is_disagreement(normalized_input):
            return random.choice(["No problem!", "Maybe later then!", "Alright!"]), False

        if self.is_appreciation(normalized_input):
            return random.choice(["You're welcome!", "Happy to help!", "Anytime!"]), False

        # If SELMA is expecting a definition from the user
        if self.learning_word:
            if normalized_input in ["i don't know", "no", "not sure", "skip"]:
                response = f"Okay, no problem. I'll try to learn '{self.learning_word}' another time."
                self.learning_word = None
                return response, False
            else:
                 # Save the definition provided by the user
                saved = self.save_word_definition(self.learning_word, user_input)
                response = f"Thanks! I've learned that '{self.learning_word}' means: {user_input}" if saved else "Sorry, I couldn't save that definition."
                self.learning_word = None
                return response, False

        # Wikipedia Search Trigger
        if any(kw in normalized_input for kw in
                ["search", "lookup", "wikipedia", "who is", "what is", "tell me about", "is", "how to","what about","how do"]):
            topic = self.extract_word_to_define(user_input)  # Reuse existing method
            if topic:
                return self.search_wikipedia(topic), False

        # Definition request
        if self.is_word_definition_request(normalized_input):
            word = self.extract_word_to_define(normalized_input)
            if word:
                definition = self.get_word_definition(word) or self.get_from_memory_db(word)
                if definition:
                    return f"The word '{word}' means: {definition}", False
                else:
                    self.learning_word = word
                    return f"I don't know '{word}'. Can you teach me what it means? (Or say 'I don't know' to skip)", False
            return "Which word would you like me to define?", False


        if any(word in normalized_input for word in ["bye", "goodbye", "see you"]):
            return "Goodbye! Come back anytime!", True

        return "I'm not sure I understand. Can you rephrase what you mean?", False

    def find_similar_response(self, input_text):
        if not self.known_patterns:
            return None
        try:
            all_patterns = self.known_patterns + [input_text.lower()]
            tfidf_matrix = self.vectorizer.fit_transform(all_patterns)
            similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])
            max_sim_idx = np.argmax(similarities)
            max_similarity = similarities[0, max_sim_idx]
            if max_similarity > 0.5:
                responses = self.known_responses[max_sim_idx]
                if isinstance(responses, list):
                    chosen = random.choice(responses)
                    if callable(chosen):
                        return chosen()
                    return chosen
        except Exception as eli:
            print(f"Similarity error: {eli}")
        return None

    def is_greeting(self, text):
        return any(greeting in text.lower() for greeting in self.greetings)

    def is_agreement(self, text):
        return any(agreement in text.lower() for agreement in self.agreement)

    def is_disagreement(self, text):
        return any(disagreement in text.lower() for disagreement in self.disagreement)

    def is_appreciation(self, text):
        return any(appreciation in text.lower() for appreciation in self.appreciation)

    def is_me(self,text):
        return any(me in text.lower() for me in self.me)

    @staticmethod
    def is_word_definition_request(text):
        triggers = ["what does", "meaning of", "define", "what is", "what's"]
        return any(trigger in text.lower() for trigger in triggers)

    @staticmethod
    def extract_word_to_define(user_input):
        # Remove common keywords and return cleaned phrase
        trigger_words = ["define", "what is", "who is", "meaning of", "tell me about", "search", "lookup", "wikipedia"]
        phrase = user_input.lower()

        for trigger in trigger_words:
            if trigger in phrase:
                phrase = phrase.replace(trigger, "")

        return phrase.strip(" ?.")

    @staticmethod
    def get_current_time():
        return f"It's {datetime.now().strftime('%I:%M %p')}"

    @staticmethod
    def get_date():
        return f"Today is {datetime.now().strftime('%B %d, %Y')}"

    @staticmethod
    def get_day():
        return f"It's {datetime.now().strftime('%A')}"

    def chat(self):
        print("SELMA: Hi! I'm your math and joke assistant. What would you like to do?")
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
            except Exception as eli:
                print(f"SELMA: Oops! Error: {eli}")


if __name__ == "__main__":
    bot = SelmaAI()
    bot.chat()