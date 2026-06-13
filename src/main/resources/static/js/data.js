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
            id: "larou",
            title: "腊肉 - 校园二手市场",
            desc: "独立开发的 Uni-app + Spring Boot 全栈项目。实现了高并发库存治理、匿名社群‘全民仲裁’状态机、以及全链路物理脱敏安全架构。",
            img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
            tags: ["Uni-app", "Spring Boot", "Redis", "AOP"],
            link: "#",
            detailImg: "img/larou_demo.png",
            detailTitle: "腊肉 — 校园二手交易全栈系统",
            detailDesc: "独立从 0 到 1 开发的校园二手交易市场小程序。针对校园高并发二手秒杀抢购、社群纷争仲裁和用户隐私泄露等痛点，构建了整套安全、稳定且有趣的交易生态体系。",
            highlights: [
                "<strong>高并发秒杀治理</strong>：采用 Redis 预减库存配合 Lua 脚本实现原子扣减，有效拦截重复请求，本地压测下单接口 QPS 提升 4 倍，且无超卖问题。",
                "<strong>匿名社群‘全民仲裁’</strong>：设计了一套基于状态机的匿名争议仲裁系统。当发布的内容被举报时，自动分派给系统随机抽取的几名‘大众评审’（用户），利用 AOP 切面拦截用户动作并记录状态流转，保证二手社群的环境纯净与判定公正。",
                "<strong>全链路安全脱敏</strong>：采用敏感信息加盐哈希与物理脱敏架构，确保学号、真实姓名和联系方式在前后端传输中仅以混淆标识存在，防御 XSS 注入与数据抓取。"
            ]
        },
        {
            id: "meishi",
            title: "美柿 - 电商小程序商城",
            desc: "参与商业级电商开发，负责首页、购物车等 5 个核心 Tab 页。攻坚多规格商品渲染与瀑布流内存优化，性能提升 30%。",
            img: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800",
            tags: ["Vue.js", "Element UI", "小程序"],
            link: "#",
            detailImg: "img/meishi_demo.png",
            detailTitle: "美柿 — 商业级多规格电商商城",
            detailDesc: "面向 C 端用户的商业级电商小程序，项目深度应用了 Uni-app 生态。我在其中负责首页、商品详情、购物车等 5 个核心业务板块的高效实现与交互攻坚。",
            highlights: [
                "<strong>复杂多规格渲染 (SKU)</strong>：设计了基于无向图的 SKU 属性状态矩阵筛选算法，支持百万级规格交叉判断，保证规格切换无延迟渲染，多规格面板加载耗时缩短至 15ms。",
                "<strong>瀑布流内存极限优化</strong>：攻坚商品瀑布流组件在长列表滑动下的卡顿问题。采用虚拟列表与 DOM 节点复用技术，动态卸载屏幕外的非可视节点，渲染层内存占用缩减 30%，滑动帧率稳定在 60 FPS。",
                "<strong>路径零硬编码实践</strong>：落实分包与路由跳转规约，统一通过 router 拦截器封装路由映射，全局屏蔽硬编码路径，从底层保证分包预下载机制的无缝衔接。"
            ]
        },
        {
            id: "resume",
            title: "个人简历",
            desc: "极致视觉冲击力的静态简历系统，支持毛玻璃特效与流光动画。",
            img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
            tags: ["HTML5", "CSS3", "Vanilla JS"],
            link: "#",
            detailImg: "img/earth-blue-marble.jpg",
            detailTitle: "伏杨天的科幻个人简历",
            detailDesc: "一份高饱和色彩、太空科幻主题的极致视觉简历。除了基础的数据渲染，还集成了 Canvas 街机射击游戏、3D 观星台和 Three.js 大气层地球同步轨道，展示了全栈开发在创意交互上的深厚功底。",
            highlights: [
                "<strong>高性能特效融合</strong>：基于 requestAnimationFrame 与 translate3d 硬件加速实现无延迟的粒子拖尾与鼠标跟随光效，CPU 占用低于 2%。",
                "<strong>3D WebGL 引擎嵌入</strong>：利用 Three.js 自制轻量化 3D 大气层地球模型，通过 IntersectionObserver 监听可见状态，离开视野时彻底暂停渲染，节省 GPU 开销。",
                "<strong>彩蛋游戏与 AI 助手</strong>：在炫技页面内嵌入了基于原生 Canvas 开发的‘星际保卫战’街机游戏（支持超频/僚机/Boss战）以及基于本地规则的 AI 助手聊天面板。"
            ]
        }
    ]
};
