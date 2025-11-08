const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector("#send-btn");

const API_KEY = "AIzaSyChPW3UlaCNSJEhjWu_loERTWI72qFY0SY";
const MODEL_NAME = "gemini-2.5-flash"; // Hoặc mô hình khác như gemini-2.5-pro

let userMessage = null;
const inputInitHeight = chatInput.scrollHeight;

// --- PHẦN NÂNG CẤP BẮT ĐẦU TỪ ĐÂY ---

// 1. Chỉ thị Hệ thống (System Instruction)
// Đây là "kim chỉ nam" cho AI, ra lệnh cho nó cách hành xử.
const SYSTEM_INSTRUCTION = {
    parts: [{ 
      text: "Bạn là một Trợ lý AI chuyên nghiệp với vai trò là 'Người kiểm chứng thông tin' (Fact-Checker). Bạn phải luôn tuân thủ các quy tắc sau:" +
              "\n\n1.  **Vai trò chính:** Cung cấp thông tin chính xác, khách quan và chính thống. Giữ vững lập trường trung lập, dựa trên sự thật." +
              "\n\n2.  **Phong cách:** Luôn thân thiện, kiên nhẫn và tôn trọng, ngay cả khi người dùng gay gắt hoặc đưa ra thông tin sai." +
              "\n\n3.  **Quy trình phản bác (Quan trọng nhất):** Khi phát hiện thông tin sai lệch hoặc luận điệu sai trái, hãy thực hiện 3 bước:" +
              "\n    a.  **Ghi nhận:** Lịch sự ghi nhận ý kiến của người dùng. (Ví dụ: 'Tôi hiểu bạn đang đề cập đến thông tin X...')" +
              "\n    b.  **Đính chính nhẹ nhàng:** Chỉ ra điểm chưa chính xác. (Ví dụ: 'Tuy nhiên, theo các nguồn thông tin chính thống, có một số điểm cần làm rõ...')" +
              "\n    c.  **Cung cấp sự thật:** Trình bày thông tin đúng một cách rõ ràng, đơn giản, và nếu có thể, hãy giải thích *tại sao* thông tin kia lại sai (ví dụ: bối cảnh bị cắt xén, hiểu lầm, v.v.)." +
              "\n\n4.  **Tránh:** Không được tranh cãi tay đôi, không dùng ngôn từ mỉa mai, không lên án người dùng. Mục tiêu là 'giáo dục' (educate) chứ không phải 'chiến thắng' (win) cuộc tranh luận." +
              "\n\n5.  **Giới hạn:** Nếu bạn không có thông tin chính thống về một chủ đề, hãy nói rõ: 'Tôi không có đủ thông tin chính thống về vấn đề này để đưa ra câu trả lời.'"
    }]
};

// 2. Lịch sử Trò chuyện
// Chúng ta sẽ lưu trữ toàn bộ cuộc hội thoại ở đây
// Chúng ta thêm tin nhắn chào mừng ban đầu vào lịch sử
let conversationHistory = [
    {
        role: "model",
        parts: [{ text: "Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?" }]
    }
];

// --- KẾT THÚC PHẦN NÂNG CẤP ---


// Hàm tạo phần tử tin nhắn (incoming/outgoing) - không thay đổi
const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", className);
    let chatContent = className === "outgoing" 
        ? `<p>${message}</p>` 
        : `<span class="material-symbols-outlined">smart_toy</span><p>${message}</p>`;
    chatLi.innerHTML = chatContent;
    return chatLi;
}

// Hàm kết nối và nhận phản hồi từ Gemini API (ĐÃ CẬP NHẬT)
const generateResponse = async (chatElement) => {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    // Tạo nội dung yêu cầu gửi lên API
    const requestBody = {
        // Gửi toàn bộ lịch sử hội thoại
        contents: conversationHistory, 
        // Gửi kèm chỉ thị hệ thống
        systemInstruction: SYSTEM_INSTRUCTION 
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();

        if (data.candidates && data.candidates.length > 0) {
            const botResponse = data.candidates[0].content.parts[0].text.trim();
            
            // Cập nhật nội dung tin nhắn đang tải bằng câu trả lời của bot
            chatElement.querySelector("p").textContent = botResponse;

            // 3. Thêm câu trả lời của bot vào lịch sử
            conversationHistory.push({ role: "model", parts: [{ text: botResponse }] });

        } else if (data.error) {
            throw new Error(data.error.message || "Lỗi API không xác định.");
        } else {
            throw new Error("Không nhận được phản hồi hợp lệ từ AI.");
        }
        
    } catch (error) {
        chatElement.querySelector("p").classList.add("error");
        chatElement.querySelector("p").textContent = `Lỗi: ${error.message}`;
        console.error("Lỗi kết nối API:", error);

        // 4. Nếu lỗi, xóa tin nhắn cuối cùng của người dùng khỏi lịch sử để họ thử lại
        conversationHistory.pop();
    } finally {
        chatbox.scrollTo(0, chatbox.scrollHeight);
    }
}

// Hàm xử lý khi người dùng gửi tin nhắn (ĐÃ CẬP NHẬT)
const handleChat = () => {
    userMessage = chatInput.value.trim();
    if (!userMessage) return;

    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    // 1. Thêm tin nhắn người dùng vào chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);
    
    // 2. Thêm tin nhắn của người dùng vào lịch sử
    conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });

    // 3. Thêm tin nhắn đang tải (loading) của bot
    setTimeout(() => {
        const incomingChatLi = createChatLi("Đang nghĩ...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi); // Gọi API
    }, 600);
}

/* --- CÁC HÀM CÒN LẠI GIỮ NGUYÊN --- */

// Tự động điều chỉnh chiều cao textarea khi nhập liệu
chatInput.addEventListener("input", () => {
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

// Gửi tin nhắn khi nhấn Enter (trừ khi nhấn Shift+Enter)
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

// Gửi tin nhắn khi nhấn nút Gửi
sendChatBtn.addEventListener("click", handleChat);

// Sự kiện đóng/mở chatbot
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));