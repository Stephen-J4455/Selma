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
async function typeMarkdown(element, markdown, delay = 3) {
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

let isGenerating = false;
let abortController = null;

async function sendMessage() {
  const input = document.getElementById("userInput");
  const sendBtn = document.querySelector(".send-btn");

  // If already generating, stop generation and reset UI
  if (isGenerating) {
    isGenerating = false;
    if (abortController) abortController.abort();
    // Remove .generating and restore icon
    if (sendBtn) {
      sendBtn.classList.remove("generating");
      sendBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M3 11L19 3L11 19L10 13L3 11Z"
            stroke="#fff"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      `;
    }
    // Remove typing indicator if present
    const chat = document.getElementById("chat");
    const typing = document.getElementById("typing");
    if (typing) chat.removeChild(typing);
    // Remove bot icon animation
    const botIcon = document.querySelector(".selma-icon");
    if (botIcon) botIcon.classList.remove("bot-animating");
    return;
  }

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

  // Add .generating to send button and change icon
  if (sendBtn) {
    sendBtn.classList.add("generating");
    sendBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#fff" stroke-width="2" fill="none" opacity="0.7"/>
        <path d="M11 5v3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  isGenerating = true;
  abortController = new AbortController();

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
      signal: abortController.signal,
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
    if (err.name === "AbortError") {
      // Generation was cancelled by user, do nothing
    } else {
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
    }
  } finally {
    isGenerating = false;
    abortController = null;
    // Remove bot icon animation
    if (botIcon) botIcon.classList.remove("bot-animating");
    // Remove .generating from send button and restore icon
    if (sendBtn) {
      sendBtn.classList.remove("generating");
      sendBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M3 11L19 3L11 19L10 13L3 11Z"
            stroke="#fff"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      `;
    }
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

// Overlay for mic/orb
function showMicOverlay() {
  // Prevent multiple overlays
  if (document.getElementById("mic-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "mic-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(30, 10, 60, 0.72)";
  overlay.style.zIndex = 10000;
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.animation = "fadeIn 0.3s";

  // Orb container
  const orbContainer = document.createElement("div");
  orbContainer.style.display = "flex";
  orbContainer.style.flexDirection = "column";
  orbContainer.style.alignItems = "center";
  orbContainer.style.justifyContent = "center";

  // Talking orb
  const orb = document.createElement("div");
  orb.className = "talking-orb";
  orb.style.width = "110px";
  orb.style.height = "110px";
  orb.style.borderRadius = "50%";
  orb.style.background = "linear-gradient(135deg, #cf00b4 30%, #7d00cc 70%)";
  orb.style.boxShadow = "0 0 60px 0 #a200ff55, 0 0 0 0 #fff";
  orb.style.display = "flex";
  orb.style.alignItems = "center";
  orb.style.justifyContent = "center";
  orb.style.position = "relative";
  orb.style.animation = "orbTalk 1.2s infinite";

  // Mic icon in orb
  orb.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Zm5-3v1a5 5 0 0 1-10 0v-1m5 6v-2"
        stroke="#fff"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
  `;

  // Optional: "Listening..." text
  const listening = document.createElement("div");
  listening.textContent = "Listening...";
  listening.style.color = "#fff";
  listening.style.fontSize = "1.2rem";
  listening.style.fontWeight = "600";
  listening.style.marginTop = "22px";
  listening.style.letterSpacing = "0.04em";
  listening.style.textShadow = "0 2px 12px #a200ff88";

  orbContainer.appendChild(orb);
  orbContainer.appendChild(listening);
  overlay.appendChild(orbContainer);

  // Close overlay on click outside orb or on Escape
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
  document.addEventListener("keydown", function escListener(ev) {
    if (ev.key === "Escape") {
      if (document.getElementById("mic-overlay")) {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", escListener);
      }
    }
  });

  document.body.appendChild(overlay);
}

// Attach mic overlay to mic element
window.addEventListener("DOMContentLoaded", () => {
  // ...existing code...
  // Attach mic overlay logic
  const mic = document.querySelector(".mic");
  if (mic) {
    // mic.style.cursor = "pointer";
    mic.onclick = showMicOverlay;
  }
});

document.querySelector(".file").addEventListener("click", () => {
  document.querySelector(".chat-box").innerHTML = "";
});
