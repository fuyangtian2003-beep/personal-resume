/**
 * 个人简历数据中心
 * 修改这里即可实时更新页面内容
 */

const RESUME_DATA = {
    profile: {
        name: "Bob",
        role: "全栈工程师 / 逻辑构筑师",
        bio: "我是一名热衷于挑战复杂逻辑的全栈工程师。我视代码为艺术，视架构为蓝图。在过去的项目中，我始终坚持“原子级”的逻辑精度，致力于打造高性能、高可用的数字产品。",
        email: "bob@example.com",
        location: "中国 · 某地",
        experience: "5+ 年开发经验"
    },
    stats: [
        { label: "完成项目", value: "50+" },
        { label: "代码提交", value: "10k+" }
    ],
    skills: [
        {
            category: "前端开发",
            icon: "ri-code-s-slash-line",
            items: [
                { name: "Vue / React", level: 90 },
                { name: "Modern CSS", level: 95 },
                { name: "TypeScript", level: 85 }
            ]
        },
        {
            category: "后端架构",
            icon: "ri-server-line",
            items: [
                { name: "Java / Spring Boot", level: 92 },
                { name: "MySQL / Redis", level: 88 },
                { name: "Node.js", level: 80 }
            ]
        }
    ],
    projects: [
        {
            title: "校园二手交易平台",
            desc: "基于 Spring Boot 的高并发校园电商系统，实现了仲裁系统与库存治理。",
            img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
            tags: ["Spring Boot", "Vue3", "Redis"],
            link: "#"
        },
        {
            title: "顶级个人简历",
            desc: "极致视觉冲击力的静态简历系统，支持毛玻璃特效与流光动画。",
            img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
            tags: ["HTML5", "CSS3", "Vanilla JS"],
            link: "#"
        }
    ]
};
