// Configure marked to use highlight.js for code blocks
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

// Typing effect for Markdown-rendered HTML
async function typeMarkdown(element, markdown, delay = 18) {
  element.innerHTML = ""; // Clear
  let html = marked.parse(markdown);
  let i = 0;
  let temp = "";
  // Reveal one character at a time (not perfect for HTML, but works for most Markdown)
  while (i < html.length) {
    temp += html[i];
    element.innerHTML = temp;
    i++;
    await new Promise((res) => setTimeout(res, delay));
  }
  // After typing, highlight code blocks and add copy buttons
  addCopyButtonsToCodeBlocks(element);
}

// First greeting with speak
window.addEventListener("DOMContentLoaded", () => {
  const chat = document.getElementById("chat");
  const botMessage = createBotMessage(
    "Hi, I'm Selma! What would you like to talk about?"
  );
  chat.appendChild(botMessage);
  scrollToBottom();
});

// Handle Enter key (shift+enter for new line)
const textarea = document.getElementById("userInput");
textarea.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  if (!message) return;

  const chat = document.getElementById("chat");
  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.textContent = message;
  chat.appendChild(userMessage);
  input.value = "";
  input.style.height = "auto"; // Reset textarea height
  scrollToBottom();

  // Animate bot icon
  const botIcon = document.querySelector(".selma-icon");
  if (botIcon) botIcon.classList.add("bot-animating");

  try {
    // Show typing indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "message bot";
    typingIndicator.id = "typing";
    typingIndicator.textContent = "...";
    chat.appendChild(typingIndicator);
    scrollToBottom();

    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    // Remove typing indicator
    chat.removeChild(typingIndicator);

    // Create bot message with action buttons at the bottom
    const botMessage = createBotMessage("");
    chat.appendChild(botMessage);

    await typeMarkdown(
      botMessage.querySelector(".response-text"),
      data.response
    );

    scrollToBottom();
  } catch (err) {
    console.error("Chat error:", err);
    // Remove typing indicator if there's an error
    const typing = document.getElementById("typing");
    if (typing) chat.removeChild(typing);

    // Show error message
    const botMessage = createBotMessage(
      "Sorry, I'm having trouble connecting. Please try again later."
    );
    chat.appendChild(botMessage);
    scrollToBottom();
  } finally {
    // Remove bot icon animation
    if (botIcon) botIcon.classList.remove("bot-animating");
  }
}

function createBotMessage(text) {
  const botMessage = document.createElement("div");
  botMessage.className = "message bot";

  // Message body
  const responseText = document.createElement("span");
  responseText.className = "response-text";
  responseText.innerHTML = marked.parse(text || "");
  botMessage.appendChild(responseText);

  // Highlight code blocks and add code-level copy button
  addCopyButtonsToCodeBlocks(responseText);

  // Message-level action buttons (copy/speak)
  const actionBtns = document.createElement("span");
  actionBtns.className = "action-btns";

  // Message-level Copy Button
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.title = "Copy";
  copyBtn.innerHTML = `
    <svg viewBox="0 0 21 21" fill="none">
      <rect x="6.2" y="6.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.45"/>
      <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.2" opacity="0.6"/>
    </svg>
  `;
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(responseText.textContent.trim()).then(() => {
      copyBtn.classList.add("copied");
      copyBtn.innerHTML = `
        <svg viewBox="0 0 22 22" fill="none">
          <path d="M6 11.5l4 4 6-7" stroke="#a200ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerHTML = `
          <svg viewBox="0 0 21 21" fill="none">
            <rect x="6.2" y="6.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.45"/>
            <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.2" opacity="0.6"/>
          </svg>
        `;
      }, 1400);
    });
  };
  actionBtns.appendChild(copyBtn);

  // Message-level Speak Button
  const speakBtn = document.createElement("button");
  speakBtn.className = "speak-btn";
  speakBtn.title = "Read aloud";
  speakBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 17V7h5l6-4v18l-6-4H4z" stroke="#5d10ec" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M17.5 8.5a5 5 0 0 1 0 7" stroke="#5d10ec" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 6a9 9 0 0 1 0 12" stroke="#5d10ec" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  speakBtn.onclick = () => {
    if (speakBtn.classList.contains("speaking")) {
      window.speechSynthesis.cancel();
      return;
    }
    document
      .querySelectorAll(".speak-btn.speaking")
      .forEach((btn) => btn.classList.remove("speaking"));
    speak(responseText.textContent, speakBtn);
  };
  actionBtns.appendChild(speakBtn);

  botMessage.appendChild(actionBtns);
  return botMessage;
}

// Helper to add copy buttons to all code blocks in a container
function addCopyButtonsToCodeBlocks(container) {
  container.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);

    // Ensure parent <pre> is positioned
    const pre = block.parentElement;
    pre.style.position = "relative";

    // Only add if not already present (avoid duplicates)
    if (!pre.querySelector(".code-copy-btn")) {
      const codeCopyBtn = document.createElement("button");
      codeCopyBtn.className = "code-copy-btn";
      codeCopyBtn.title = "Copy code";
      codeCopyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
          <rect x="6.2" y="6.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.45"/>
          <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.2" opacity="0.6"/>
        </svg>
      `;
      codeCopyBtn.onclick = () => {
        navigator.clipboard.writeText(block.textContent).then(() => {
          codeCopyBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <path d="M6 11.5l4 4 6-7" stroke="#a200ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
          setTimeout(() => {
            codeCopyBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                <rect x="6.2" y="6.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.45"/>
                <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" stroke="#5d10ec" stroke-width="1.2" opacity="0.6"/>
              </svg>
            `;
          }, 1200);
        });
      };
      pre.appendChild(codeCopyBtn);
    }
  });
}

function speak(text, speakBtn) {
  if (!window.speechSynthesis) return;
  const utter = new window.SpeechSynthesisUtterance(text.trim());
  utter.onstart = () => {
    if (speakBtn) speakBtn.classList.add("speaking");
  };
  utter.onend = () => {
    if (speakBtn) speakBtn.classList.remove("speaking");
  };
  utter.onerror = () => {
    if (speakBtn) speakBtn.classList.remove("speaking");
  };
  utter.voice =
    speechSynthesis.getVoices().find((v) => v.lang.startsWith("en")) || null;
  utter.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function scrollToBottom() {
  const chat = document.getElementById("chat");
  chat.scrollTop = chat.scrollHeight;
}
