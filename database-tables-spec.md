# 数据库设计说明 (Database Spec)

> 严禁使用 openid 关联表，统一使用内部自增数字 id。

## 1. 简历基础信息表 (resume_profile)
| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| id | bigint | 自增主键 | 内部唯一标识 |
| name | varchar(64) | 姓名 | |
| title | varchar(128) | 职位/头衔 | |
| avatar | varchar(255) | 头像 URL | |
| bio | text | 个人简介 | |
| create_time | datetime | 创建时间 | |
| update_time | datetime | 更新时间 | |

## 2. 技能表 (resume_skills)
| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| id | bigint | 自增主键 | |
| profile_id | bigint | 关联 Profile ID | 外键关联 |
| skill_name | varchar(64) | 技能名称 | |
| proficiency | int | 熟练度 (0-100) | |
| category | varchar(32) | 类别 | 如：Frontend, Backend, DevOps |

## 3. 项目经历表 (resume_projects)
| 字段名 | 类型 | 说明 | 备注 |
| :--- | :--- | :--- | :--- |
| id | bigint | 自增主键 | |
| name | varchar(128) | 项目名称 | |
| description | text | 项目描述 | |
| tech_stack | varchar(255) | 技术栈 | 逗号分隔 |
| link | varchar(255) | 项目链接 | |
