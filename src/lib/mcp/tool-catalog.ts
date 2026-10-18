import { McpToolDefinition } from "./types";

/**
 * Standard inFlow MCP Tool Catalog Specification
 * Provides LLM agent runners with exact descriptions and JSON schemas.
 */
export const INFLOW_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "inflow_list_accounts",
    description:
      "لیست پیج‌های اینستاگرام متصل به inFlow، وضعیت هارت‌بیت و تعداد اتوماسیون‌های فعال. (List all Instagram accounts managed by inFlow and their automation status.)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "inflow_get_active_automations",
    description:
      "دریافت پست‌ها و ریلزهای دارای پاسخ خودکار فعال (auto_reply = 1) به همراه کلمات کلیدی، پرامپت هوش مصنوعی و متن پاسخ دایرکت و کامنت به تومان یا دینار. (Retrieve active posts and their auto-reply trigger & action rules for an account.)",
    inputSchema: {
      type: "object",
      properties: {
        account_username: {
          type: "string",
          description: "نام کاربری پیج اینستاگرام (مانند 'r9spoort1')",
        },
      },
      required: ["account_username"],
    },
  },
  {
    name: "inflow_record_comment_interaction",
    description:
      "ثبت لاگ تعامل و پاسخ به کامنت با قفل آیدمپوتنسی بر اساس comment_id برای جلوگیری قطعی از پاسخ تکراری و شدوبن اینستاگرام. (Record a comment processing attempt, reply status, and DM delivery with strict comment_id uniqueness.)",
    inputSchema: {
      type: "object",
      properties: {
        account_username: {
          type: "string",
          description: "نام کاربری پیج اینستاگرام صاحب پست",
        },
        shortcode: {
          type: "string",
          description: "کد کوتاه پست در اینستاگرام (مانند 'DehQhnjoEcr')",
        },
        comment_id: {
          type: "string",
          description: "شناسه یکتای کامنت اینستاگرام (کلید قفل آیدمپوتنسی)",
        },
        username: {
          type: "string",
          description: "نام کاربری شخص کامنت‌گذار",
        },
        comment_text: {
          type: "string",
          description: "متن اصلی کامنت کاربر",
        },
        trigger_matched: {
          type: "boolean",
          description: "آیا کامنت با شروط تریگر یا کلمات کلیدی مطابقت داشته است؟",
        },
        comment_reply_status: {
          type: "string",
          enum: ["none", "sent", "failed", "skipped"],
          description: "وضعیت ارسال ریپلای عمومی به کامنت",
        },
        comment_reply_text: {
          type: "string",
          description: "متن ارسال شده در ریپلای کامنت (در صورت ارسال)",
        },
        dm_status: {
          type: "string",
          enum: ["none", "sent", "pending_follow", "failed", "skipped"],
          description: "وضعیت ارسال پیام در دایرکت",
        },
        dm_text: {
          type: "string",
          description: "متن ارسال شده در دایرکت (در صورت ارسال)",
        },
      },
      required: [
        "account_username",
        "shortcode",
        "comment_id",
        "username",
        "comment_text",
      ],
    },
  },
  {
    name: "inflow_push_scraped_posts",
    description:
      "ثبت یا به‌روزرسانی پست‌ها و ریلزهای اسکرپ شده از اینستاگرام در کاتالوگ inFlow. (Bulk insert or update scraped Instagram posts and reels in the inFlow catalog.)",
    inputSchema: {
      type: "object",
      properties: {
        account_username: {
          type: "string",
          description: "نام کاربری پیج اینستاگرام هدف",
        },
        job_id: {
          type: "number",
          description: "شناسه تسک مرتبط در جدول agent_jobs (در صورت اجرا از طریق جاب سینک)",
        },
        posts: {
          type: "array",
          description: "آرایه پست‌ها و ریلزهای اسکرپ شده",
          items: {
            type: "object",
            properties: {
              shortcode: {
                type: "string",
                description: "کد کوتاه پست",
              },
              media_id: {
                type: "string",
                description: "شناسه مدیا در اینستاگرام",
              },
              url: {
                type: "string",
                description: "آدرس وب پست یا ریلز",
              },
              post_type: {
                type: "string",
                enum: ["reel", "post"],
                description: "نوع مدیا",
              },
              thumbnail_url: {
                type: "string",
                description: "آدرس تصویر کاور یا بندانگشتی",
              },
              caption: {
                type: "string",
                description: "کپشن پست (شامل قیمت‌ها به تومان یا توضیحات محصول)",
              },
            },
            required: ["shortcode"],
          },
        },
      },
      required: ["account_username", "posts"],
    },
  },
  {
    name: "inflow_update_post_rules",
    description:
      "تنظیم یا ویرایش قوانین اتوماسیون (کلمات کلیدی، پرامپت متنی هوش مصنوعی، متن کامنت و دایرکت) برای یک پست. (Update automation rules and triggers for a post.)",
    inputSchema: {
      type: "object",
      properties: {
        shortcode: {
          type: "string",
          description: "کد کوتاه پست",
        },
        auto_reply: {
          type: "boolean",
          description: "روشن یا خاموش بودن پاسخ خودکار",
        },
        trigger_type: {
          type: "string",
          enum: ["all", "keywords", "ai_context"],
          description: "نوع شرط تریگر",
        },
        trigger_keywords: {
          type: "array",
          items: { type: "string" },
          description: "لیست کلمات کلیدی شرطی",
        },
        trigger_context: {
          type: "string",
          description: "دستورالعمل هوش مصنوعی برای تشخیص مرتبط بودن کامنت",
        },
        comment_action_type: {
          type: "string",
          enum: ["none", "direct", "ai"],
          description: "نوع اقدام برای ریپلای کامنت",
        },
        comment_action_text: {
          type: "string",
          description: "متن مستقیم یا پرامپت ریپلای کامنت",
        },
        dm_action_type: {
          type: "string",
          enum: ["none", "direct", "ai"],
          description: "نوع اقدام برای پیام دایرکت",
        },
        dm_action_text: {
          type: "string",
          description: "متن مستقیم یا پرامپت پیام دایرکت (قیمت‌ها به تومان)",
        },
        dm_require_follow: {
          type: "boolean",
          description: "آیا ارسال دایرکت مشروط به فالو داشتن پیج است؟",
        },
      },
      required: ["shortcode"],
    },
  },
  {
    name: "inflow_get_pending_jobs",
    description:
      "بررسی صف تسک‌های محول‌شده (مانند سینک درخواستی از داشبورد) برای یک پیج. (Get pending and unacknowledged jobs for an account.)",
    inputSchema: {
      type: "object",
      properties: {
        account_username: {
          type: "string",
          description: "نام کاربری پیج اینستاگرام",
        },
      },
      required: ["account_username"],
    },
  },
  {
    name: "inflow_complete_job",
    description:
      "گزارش اتمام موفقیت‌آمیز یا ناموفق یک تسک محول‌شده همراه با خلاصه کار. (Mark an agent job as completed or failed with execution summary.)",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "number",
          description: "شناسه یکتای تسک",
        },
        status: {
          type: "string",
          enum: ["completed", "failed"],
          description: "وضعیت نهایی تسک",
        },
        result_summary: {
          type: "object",
          description: "خلاصه اطلاعات ثبت شده (مثلا تعداد پست‌های جدید)",
        },
        error_message: {
          type: "string",
          description: "پیام خطای رخ داده در صورت شکست",
        },
      },
      required: ["job_id", "status"],
    },
  },
];
