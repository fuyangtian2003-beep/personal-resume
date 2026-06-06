/**
 * AI 助手客户端交互逻辑
 */
document.addEventListener("DOMContentLoaded", () => {
    const chatWidget = document.getElementById("ai-chat-widget");
    const chatTrigger = document.getElementById("ai-chat-trigger");
    const chatPanel = document.getElementById("ai-chat-panel");
    const chatClose = document.getElementById("ai-chat-close");
    const chatMessages = document.getElementById("ai-chat-messages");
    const chatInput = document.getElementById("ai-chat-input");
    const chatSend = document.getElementById("ai-chat-send");

    // 默认的 API 请求地址。由于蹭另一个项目的后端，直接把这个 baseURL 改为另一个后端的绝对地址
    const API_BASE_URL = "https://larou.fythub.top:9443";

    // 伏杨天（Bob）的真实简历数据底座，防止 AI 编造幻觉
    const RESUME_INFO = `
【关于伏杨天（Bob）】
- 职业定位：小程序全栈开发工程师 / 后端开发工程师。主攻 Java & Spring Boot 体系，具备从0到1工程落地能力。
- 坐标学校：湖南信息学院，2026届软件工程本科，目前在湖南长沙。
- 核心技能：
  * 前端 & 移动端：Vue.js / Uni-app、微信小程序原生开发、HTML5 / CSS3 / JavaScript (ES6+)。
  * 后端 & 数据库：Java / Spring Boot、Redis / MySQL、Linux / SSH / Shell 脚本。
  * 工具与效率：AIGC 辅助开发、Git、Postman、COS 安全方案。
- 实战项目：
  1. 【腊肉 - 校园二手市场】（全栈独立开发）：实现高并发库存治理、匿名社群“全民仲裁”状态机、以及全链路物理脱敏安全架构。
  2. 【美柿 - 电商小程序商城】（核心参与）：负责首页、购物车等5个核心 Tab 页，攻坚多规格商品渲染与瀑布流内存优化，性能提升 30%。
  3. 【个人简历网站】：极致视觉冲击力，支持毛玻璃特效、一镜到底Canvas超导芯片展示、星际代码保卫战游戏、访客成就解锁系统。
- 联络方式：
  * 邮箱：FYTResume@fuyangtianbob.de5.net
  * 微信：FYTBob
`;

    // 维护多轮对话历史上下文
    let chatHistory = [
        {
            role: "system",
            content: `你是一个搭载在程序员伏杨天（Bob）的个人简历上的 AI 助手。
你的任务是根据提供的“伏杨天的真实简历数据”，客观、真实、条理清晰地回答访客的咨询。
请严格遵守以下守则：
1. 绝对不要捏造、瞎编任何关于伏杨天的学习经历、项目经验、求职意向或技术能力。如果访客问起数据中未提及的事情，请礼貌地回答：“目前我的知识库里没有这方面的记录，你可以直接联系伏杨天（Bob）本人交流噢。”
2. 保持专业、靠谱、谦虚有礼的极客态度，用词简练、重点突出，禁止回答得过于浮夸或语无伦次。
3. 支持普通的技术聊天（如简单解释下 Spring AOP 等），但最终请幽默地导回伏杨天的简历上来。
4. 必须使用中文回答。
5. 推荐：在自我介绍结尾或访客对项目细节、互动特效、炫技页面感兴趣时，积极且幽默地引导他们“点击网页右上角的菜单（三道杠按钮）”，去探秘【访客成就系统】、通往炫技的【赛博实验室】、全栈阻尼联动的【芯片实验室】以及 3D 一镜到底的【3D 芯片体验舱】！

--- 伏杨天的真实简历数据 ---
${RESUME_INFO}`
        }
    ];

    // 初始化状态
    let isSending = false;

    // 展开面板
    chatTrigger.addEventListener("click", () => {
        chatWidget.classList.add("open");
        chatPanel.classList.remove("hidden");
        chatTrigger.style.transform = "scale(0)";
        chatTrigger.style.opacity = "0";
        chatTrigger.style.pointerEvents = "none";
        setTimeout(() => {
            chatInput.focus();
        }, 300);
    });

    // 收起面板
    chatClose.addEventListener("click", () => {
        chatWidget.classList.remove("open");
        chatPanel.classList.add("hidden");
        chatTrigger.style.transform = "scale(1)";
        chatTrigger.style.opacity = "1";
        chatTrigger.style.pointerEvents = "auto";
    });

    // 输入框自适应高度
    chatInput.addEventListener("input", () => {
        chatInput.style.height = "auto";
        chatInput.style.height = chatInput.scrollHeight + "px";
    });

    // 发送消息
    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text || isSending) return;

        isSending = true;
        chatInput.value = "";
        chatInput.style.height = "auto";
        chatInput.disabled = true;
        chatSend.disabled = true;

        // 1. 渲染用户消息
        appendMessage("user", text);
        chatHistory.push({ role: "user", content: text });

        // 2. 渲染 Bot 的 Loading 状态
        const loadingId = appendLoadingBubble();
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // 3. 向后端发起请求
            const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: chatHistory
                })
            });

            // 移除 Loading 状态
            removeLoadingBubble(loadingId);

            const result = await response.json();

            if (!response.ok) {
                // 处理后端拦截的报错（例如 429 限流或 500 未配置 Key 报错）
                const errMsg = result.error || "请求出错了，请稍后再试。";
                appendMessage("error", errMsg);
                isSending = false;
                enableInput();
                return;
            }

            // 4. 解析响应，获取 AI 回复内容
            if (result.choices && result.choices[0] && result.choices[0].message) {
                const replyText = result.choices[0].message.content;
                chatHistory.push({ role: "assistant", content: replyText });

                // 5. 模拟打字机动画渲染 Bot 消息
                appendTypewriterMessage(replyText);
            } else if (result.error) {
                // 自动捕获并展示具体的错误，避免显示模糊的错误文案
                const errMsg = result.error.message || JSON.stringify(result.error);
                appendMessage("error", `OpenRouter 报错: ${errMsg}`);
                isSending = false;
                enableInput();
            } else {
                appendMessage("error", "未收到有效的 AI 回复，请检查后端配置或接口返回值。");
                isSending = false;
                enableInput();
            }

        } catch (error) {
            console.error("AI Request Error:", error);
            removeLoadingBubble(loadingId);
            appendMessage("error", "网络连接异常，请确保 Spring Boot 后端服务处于运行状态！");
            isSending = false;
            enableInput();
        }
    };

    // 发送按钮点击
    chatSend.addEventListener("click", sendMessage);

    // 回车键发送 (Shift+Enter 换行)
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 启用输入
    const enableInput = () => {
        chatInput.disabled = false;
        chatSend.disabled = false;
        chatInput.focus();
    };

    // 获取当前时间字符串
    const getCurrentTime = () => {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, "0");
        const mins = String(now.getMinutes()).padStart(2, "0");
        return `${hrs}:${mins}`;
    };

    // 向消息面板追加静态气泡 (User, Error, 或者非打字机的 Bot 气泡)
    const appendMessage = (sender, content) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = `ai-msg ${sender}`;

        const contentDiv = document.createElement("div");
        contentDiv.className = "msg-content";
        contentDiv.textContent = content;

        const timeDiv = document.createElement("div");
        timeDiv.className = "msg-time";
        timeDiv.textContent = getCurrentTime();

        msgDiv.appendChild(contentDiv);
        msgDiv.appendChild(timeDiv);
        chatMessages.appendChild(msgDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // 追加 Loading 动画气泡
    const appendLoadingBubble = () => {
        const loadingId = "ai-loading-" + Date.now();
        const msgDiv = document.createElement("div");
        msgDiv.className = "ai-msg bot";
        msgDiv.id = loadingId;

        const contentDiv = document.createElement("div");
        contentDiv.className = "msg-content";

        const indicator = document.createElement("div");
        indicator.className = "typing-indicator";
        indicator.innerHTML = "<span></span><span></span><span></span>";

        contentDiv.appendChild(indicator);
        msgDiv.appendChild(contentDiv);
        chatMessages.appendChild(msgDiv);

        return loadingId;
    };

    // 移除 Loading 气泡
    const removeLoadingBubble = (id) => {
        const bubble = document.getElementById(id);
        if (bubble) {
            bubble.remove();
        }
    };

    // 模拟打字机效果追加 Bot 消息
    const appendTypewriterMessage = (text) => {
        const msgDiv = document.createElement("div");
        msgDiv.className = "ai-msg bot";

        const contentDiv = document.createElement("div");
        contentDiv.className = "msg-content typing-cursor";

        const timeDiv = document.createElement("div");
        timeDiv.className = "msg-time";
        timeDiv.textContent = getCurrentTime();

        msgDiv.appendChild(contentDiv);
        msgDiv.appendChild(timeDiv);
        chatMessages.appendChild(msgDiv);

        let index = 0;
        const typingSpeed = 15; // 毫秒/字

        const type = () => {
            if (index < text.length) {
                contentDiv.textContent += text.charAt(index);
                index++;
                chatMessages.scrollTop = chatMessages.scrollHeight;
                setTimeout(type, typingSpeed);
            } else {
                contentDiv.classList.remove("typing-cursor");
                isSending = false;
                enableInput();
            }
        };

        type();
    };
});
