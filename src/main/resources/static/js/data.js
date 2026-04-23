/**
 * 个人简历数据中心
 * 修改这里即可实时更新页面内容
 */

const RESUME_DATA = {
    profile: {
        name: "Bob",
        chineseName: "伏杨天",
        role: "小程序全栈开发工程师 / 后端开发工程师",
        bio: "主攻 Java & Spring Boot 体系，具备从 0 到 1 的工程化落地能力。在移动端深度实践“分包预下载 + 骨架屏”方案，后端构建基于 AOP 的审计拦截与状态机底座。坚持“全栈技术闭环”，擅长攻坚高并发场景下的库存治理与安全架构。",
        email: "FYTResume@fuyangtianbob.de5.net",
        phone: "15348404500",
        location: "湖南 · 长沙",
        experience: "2026届 · 软件工程本科",
        school: "湖南信息学院"
    },
    stats: [
        { label: "实战项目", value: "10+" },
        { label: "核心代码", value: "50k+" },
        { label: "业务场景", value: "40+" }
    ],
    skills: [
        {
            category: "前端 & 移动端",
            icon: "ri-code-s-slash-line",
            items: [
                { name: "Vue.js / Uni-app", level: 92 },
                { name: "微信小程序原生开发", level: 90 },
                { name: "HTML5 / CSS3 / JS", level: 95 }
            ]
        },
        {
            category: "后端 & 数据库",
            icon: "ri-server-line",
            items: [
                { name: "Java / Spring Boot", level: 94 },
                { name: "Redis / MySQL", level: 88 },
                { name: "Linux / SSH / Shell", level: 85 }
            ]
        },
        {
            category: "工具与效率",
            icon: "ri-tools-line",
            items: [
                { name: "AIGC 辅助开发", level: 98 },
                { name: "Git / Postman", level: 90 },
                { name: "COS 安全方案", level: 82 }
            ]
        }
    ],
    projects: [
        {
            title: "腊肉 - 校园二手市场",
            desc: "独立开发的 Uni-app + Spring Boot 全栈项目。实现了高并发库存治理、匿名社群‘全民仲裁’状态机、以及全链路物理脱敏安全架构。",
            img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
            tags: ["Uni-app", "Spring Boot", "Redis", "AOP"],
            link: "#"
        },
        {
            title: "美柿 - 电商小程序商城",
            desc: "参与商业级电商开发，负责首页、购物车等 5 个核心 Tab 页。攻坚多规格商品渲染与瀑布流内存优化，性能提升 30%。",
            img: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800",
            tags: ["Vue.js", "Element UI", "小程序"],
            link: "#"
        },
        {
            title: "个人简历",
            desc: "极致视觉冲击力的静态简历系统，支持毛玻璃特效与流光动画。",
            img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
            tags: ["HTML5", "CSS3", "Vanilla JS"],
            link: "#"
        }
    ]
};
