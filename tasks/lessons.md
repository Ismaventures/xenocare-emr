# Lessons

- When a user narrows documentation scope mid-task (for example from README plus PDF to README only), stop planning extra deliverables immediately and finish the requested artifact first.
- When a user asks for training documentation by department, module summaries alone are not enough; add department-by-department workflows that say where to start, what order to work in, and where to hand off next.
- When fixing duplicate identifier errors across similar functions, run a full symbol search and verify declaration-use pairs per function scope before ending the patch.
- When a user updates UI direction mid-task (for example, sidebar to top navigation), treat the latest instruction as authoritative and propagate the pattern across all related encounter timeline views for consistency.
- For encounter switchers, never use record status in option labels (e.g., Pending); labels must prioritize encounter_number with a deterministic ENC-* fallback.
- In dense clinical timelines, replace wide multi-button tab strips with a single explicit section dropdown to preserve writing space and reduce visual scatter.
- In medical report workflows, always guard mutation IDs (`id`/`report_id`) before API calls and avoid hard-coding one key column when schema drift is possible.
- Brand refreshes must not become global UI palette replacements. Preserve the product's established semantic palette unless the user explicitly approves a redesign; introduce parent-brand colours through isolated logo and attribution surfaces.
- When a user says colours are mixed up, stop extending the palette work, present a focused design concept first, then implement the approved direction consistently.
- For bulk source edits on Windows, use explicit UTF-8 reads/writes and recheck non-ASCII strings afterwards; `Get-Content` defaults can silently corrupt bullets, currency symbols, and accented characters.
- A dev-server `Cannot GET /index.html` response means the HTML was not emitted; inspect webpack's module-resolution errors before changing routes or server config.
