# âš¡ Giant Automation Library

**Giant Automation Library**, [Voyagerroc-Automation](https://github.com/Voyagerroc-Automation) organizasyonunun Ã¼retim seviyesindeki **n8n iÅŸ akÄ±ÅŸlarÄ±nÄ± (workflows)**, otonom tetikleyicilerini ve AI iÅŸlem ÅŸablonlarÄ±nÄ± barÄ±ndÄ±ran merkezi kÃ¼tÃ¼phanedir.

---

## ğŸ—‚ï¸ KÃ¼tÃ¼phane Mimarisi

```
giant-automation-library/
â”œâ”€â”€ workflows/
â”‚   â”œâ”€â”€ 01-video-generation/       â† Higgsfield / Seedance 2.5 (3-Shot / 30s) sinematik Ã¼retim akÄ±ÅŸlarÄ±
â”‚   â”œâ”€â”€ 02-social-distribution/    â† YouTube Shorts, TikTok & IG otonom daÄŸÄ±tÄ±m ve zamanlama
â”‚   â”œâ”€â”€ 03-content-creation/       â† Viral hook, senaryo ve storyboard Ã¼retim akÄ±ÅŸlarÄ±
â”‚   â”œâ”€â”€ 04-agent-orchestration/    â† Voyagerroc-Agents tetikleme ve karar aÄŸaÃ§larÄ±
â”‚   â””â”€â”€ 05-monitoring-audit/       â† Open-LLM-Audit-Trail hata ve operasyon loglama
â”œâ”€â”€ templates/                     â† Tek tÄ±kla n8n iÃ§ine import edilebilir .json ÅŸablonlarÄ±
â”œâ”€â”€ scripts/                       â† Workflow test ve senkronizasyon araÃ§larÄ±
â””â”€â”€ docs/                          â† Webhook ÅŸemalarÄ± ve entegrasyon kÄ±lavuzlarÄ±
```

---

## ğŸ¬ Dahili 3-Shot (30s) Sinematik Prompt Motoru
- **Platform:** Higgsfield & Seedance 2.5
- **YapÄ±:** 3 x 10s (Toplam 30s)
- **Ã–zellikler:**
  - **Negatif prompt tuzaÄŸÄ± yok:** DoÄŸrudan pozitif fizik ve materyal tanÄ±mlarÄ±.
  - **Zaman kodlu hareketler:** `0.0s-3.0s`, `3.0s-7.5s`, `7.5s-10.0s` ÅŸeklinde milimetrik planlama.
  - **Match-Cut kilidi:** Shot 1'in bitiÅŸ karesi ile Shot 2'nin baÅŸlangÄ±Ã§ pozisyonunun kusursuz eÅŸleÅŸmesi.

---

## ğŸš€ n8n'e NasÄ±l Ä°Ã§e AktarÄ±lÄ±r?
1. n8n arayÃ¼zÃ¼nÃ¼zÃ¼ aÃ§Ä±n (`http://localhost:5678`).
2. SaÄŸ Ã¼stten **Workflows > Import from File** seÃ§eneÄŸine tÄ±klayÄ±n.
3. `workflows/` klasÃ¶rÃ¼ altÄ±ndaki ilgili `.json` dosyasÄ±nÄ± seÃ§in.
4. Webhook URL'ini aktif hale getirin.

---
Â© 2026 Voyagerroc Automation. All rights reserved.
