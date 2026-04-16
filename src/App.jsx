import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-3.5-turbo",
          stream: true,
          messages: [
            {
              role: "system",
              content: `
You are a helpful assistant.
- Do NOT explain your formatting
- Do NOT include separators like --8<--
- Always answer the user's question directly
- Use proper Markdown bullet points (-, *, or numbered lists)
`,
            },
            ...updatedMessages,
          ],
        },
        {
          headers: {
            Authorization: `Bearer Api-Key`,
            "Content-Type": "application/json",
          },
          responseType: "text",
        }
      );

      let fullText = "";
      const lines = response.data.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "").trim();

        if (data === "[DONE]") break;

        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content || "";
          fullText += token;
        } catch (err) {
          console.log("Parse error:", err);
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullText || "No response",
        };
        return updated;
      });
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong while getting the response.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="chat-card">
        <div className="chat-header">
          <div>
            <h2 className="chat-title">AI Chatbot</h2>
            <p className="chat-subtitle">Ask anything and get clean markdown replies.</p>
          </div>
          <div className="status-pill">
            <span className="status-dot"></span>
            Online
          </div>
        </div>

        <div className="chat-box">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h5>Start a conversation</h5>
              <p>Write your first message below.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`message-row ${
                  msg.role === "user" ? "message-row-user" : "message-row-bot"
                }`}
              >
                {msg.role === "assistant" && <div className="avatar bot-avatar">AI</div>}

                <div
                  className={`message-bubble ${
                    msg.role === "user" ? "user-bubble" : "bot-bubble"
                  }`}
                >
                  <ReactMarkdown>
                    {msg.content || (msg.role === "assistant" ? "..." : "")}
                  </ReactMarkdown>
                </div>

                {msg.role === "user" && <div className="avatar user-avatar">You</div>}
              </div>
            ))
          )}

          {loading && (
            <div className="message-row message-row-bot">
              <div className="avatar bot-avatar">AI</div>
              <div className="message-bubble bot-bubble typing-bubble">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-wrap">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button className="send-btn" onClick={sendMessage} disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}