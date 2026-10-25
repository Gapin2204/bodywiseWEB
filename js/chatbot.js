const api = window.bodywiseApi;
const list = document.getElementById("conversationList");
const messages = document.getElementById("chatMessages");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatMessage");
let activeConversationId = null;

function addMessage(role, content, pending = false) {
  const item = document.createElement("div");
  item.className = `chat-message ${role}`;
  item.textContent = content;
  if (pending) item.classList.add("chat-loading");
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
  return item;
}

async function loadConversations() {
  const { conversations } = await api.get("/chatbot/conversations");
  list.replaceChildren();
  if (!conversations.length) {
    const empty = document.createElement("p");
    empty.className = "conversation-empty";
    empty.textContent = "Belum ada percakapan.";
    list.append(empty);
    return;
  }
  conversations.forEach(conversation => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-item";
    button.classList.toggle("active", String(conversation.id) === String(activeConversationId));
    button.textContent = conversation.title;
    button.addEventListener("click", () => loadMessages(conversation.id));
    list.append(button);
  });
}

async function loadMessages(id) {
  try {
    const { messages: history } = await api.get(`/chatbot/conversations/${id}/messages`);
    activeConversationId = id;
    messages.replaceChildren();
    history.forEach(message => addMessage(message.role, message.content));
    await loadConversations();
  } catch (error) {
    api.toast(error.message, "error");
  }
}

document.getElementById("newConversation").addEventListener("click", () => {
  activeConversationId = null;
  messages.replaceChildren();
  addMessage("assistant", "Hai! Saya dapat membantu menjelaskan fitur BODYWISE serta topik nutrisi, olahraga, dan kebiasaan sehat secara umum. Saya tidak memberikan diagnosis.");
  loadConversations().catch(error => api.toast(error.message, "error"));
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  input.disabled = true;
  form.querySelector("button").disabled = true;
  addMessage("user", message);
  input.value = "";
  const pending = addMessage("assistant", "Menyiapkan jawaban…", true);
  try {
    const result = await api.post("/chatbot/message", { message, conversationId: activeConversationId || undefined });
    activeConversationId = result.conversationId;
    pending.remove();
    addMessage("assistant", result.message.content);
    await loadConversations();
  } catch (error) {
    pending.remove();
    api.toast(error.message, "error");
  } finally {
    input.disabled = false;
    form.querySelector("button").disabled = false;
    input.focus();
  }
});

addMessage("assistant", "Hai! Saya dapat membantu menjelaskan fitur BODYWISE serta topik nutrisi, olahraga, dan kebiasaan sehat secara umum. Saya tidak memberikan diagnosis.");
loadConversations().catch(error => api.toast(error.message, "error"));
