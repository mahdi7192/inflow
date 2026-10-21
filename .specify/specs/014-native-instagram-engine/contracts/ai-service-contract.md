# Contract: AI Context Analysis & Reply Generation Service

**Feature**: `014-native-instagram-engine`  
**Provider**: OpenAI / Google Gemini / Anthropic compatible HTTP endpoint  
**Module**: `engine/ai_service.py` & `src/lib/ai-client.ts`

---

## 1. Comment Analysis & Trigger Evaluation

### Input Payload
```json
{
  "post_caption": "ست ورزشی زمستانه نایکی، ضدآب و فوق‌العاده گرم. قیمت ۳۰ هزار دینار...",
  "comment_text": "سلام خسته نباشید قیمت چنده؟ سایز لارج دارین؟",
  "commenter_username": "customer_42",
  "trigger_type": "ai_context",
  "trigger_context": "پاسخ به سوالات درباره قیمت، سایزبندی و ثبت سفارش",
  "trigger_keywords": ["قیمت", "سایز", "چنده"],
  "dm_template": "قیمت ۳۰ هزار دینار است و سایزهای M و L موجود هستند.",
  "language": "fa"
}
```

### Output Response Schema
```json
{
  "is_match": true,
  "confidence": 0.96,
  "intent": "price_and_size_inquiry",
  "public_reply": {
    "text": "درود @customer_42 عزیز! جزئیات کامل و سایزبندی در دایرکت خدمتتان ارسال شد 📩"
  },
  "private_dm": {
    "text": "سلام و عرض ادب! ست نایکی ۳۰ هزار دینار است و در حال حاضر سایز لارج (L) موجود می‌باشد. مایلید براتون ثبت کنم؟ 🌟"
  }
}
```

---

## 2. Fallback Policy
If the AI service times out (> 4,500ms) or encounters an API error (rate limits, network failure):
1. Evaluate deterministic keyword match (`trigger_keywords`).
2. If matched, fall back immediately to `posts.comment_action_text` and `posts.dm_action_text`.
3. Log the fallback reason under `comment_logs` without failing the automation pipeline.
