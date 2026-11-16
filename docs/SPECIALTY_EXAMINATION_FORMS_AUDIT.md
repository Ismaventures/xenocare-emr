# Specialty Examination Forms — Architecture Analysis & Improvement Plan

> **Date:** March 4, 2026  
> **Scope:** All 18 specialty clinic examination templates + GOPD  
> **Objective:** Reduce typing burden, increase structured data capture, align with global EMR best practices, maintain Nigerian clinical context

---

## 1. Architecture Summary

### How It Works Today

| Layer | Description |
|-------|-------------|
| **Template Definitions** | `constants/specialty-templates.ts` — single 18,889-line file containing all 18 specialty template objects as TypeScript constants |
| **Type System** | `dtos/specialty-template.dto.ts` — SpecialtyTemplate → SpecialtyTemplateSection → SpecialtyTemplateField hierarchy with 12 field types |
| **Dynamic Renderer** | `components/SpecialtyExaminationRenderer.tsx` — single component renders any template dynamically based on field type |
| **Wizard Integration** | `SpecialtyConsultationWizard.tsx` loads the template and passes sections to the renderer as Step 4 (Specialty Examination) |
| **Data Storage** | Examination data stored as JSONB in `consultations.specialty_data` with namespaced keys (e.g., `cardi.field_code`) |
| **Template Resolution** | `hooks/useSpecialtyTemplate.ts` maps clinic names → specialty codes → template objects |
| **GOPD (Non-Specialty)** | Uses `ConsultationWizard.tsx` which has **free-text textarea** fields for examination (no structured data) |

### Supported Field Types

| Type | Rendering | Used Effectively? |
|------|-----------|-------------------|
| `text` | Single-line input | ⚠️ Overused for structured data |
| `textarea` | Multi-line text area | ⚠️ Overused where structured selects would be better |
| `number` | Numeric input with min/max | ✅ Good |
| `select` | Single dropdown | ✅ Good |
| `multiselect` | Multi-select dropdown | ✅ Underused |
| `checkbox` | Single boolean toggle | ✅ Good |
| `checkbox_group` | Multi-select checkboxes | ✅ Good — most-used structured type |
| `radio` | Radio button group | ✅ Good |
| `date` | Date picker | ⚠️ Rarely used |
| `scale` | Numeric scale (e.g., 0-10) | ❌ Not used in any template |
| `measurement` | Value + unit | ⚠️ Barely used (only dermatology) |
| `rich_text` | Rich text editor | ❌ Not used in any template |

### Conditional Logic

The system supports conditional display via the `conditional_display` property:
```typescript
conditional_display: {
  field: 'murmur_present',   // Watch this field
  operator: 'equals',        // equals | not_equals | contains | not_empty | greater_than | less_than
  value: 'yes',              // Show only when murmur_present === 'yes'
}
```

**Status:** ✅ Implemented and working in the renderer. Used effectively by Cardiology (murmur details), General Surgery (hernia details), Gynaecology (discharge types, breast exam), and a few others. **Underutilized** by most templates.

---

## 2. Per-Specialty Audit

### Legend
- 🟢 **Good** — Clinically complete, mostly structured
- 🟡 **Fair** — Functional but needs improvement
- 🔴 **Poor** — Major gaps or excessive free-text
- ❌ **Placeholder** — Only generic textarea fields

---

### 2.1 GOPD (General Outpatient)

**Form Type:** Non-template (ConsultationWizard.tsx)  
**Rating:** 🔴 **Poor — Entirely Free-Text**

| Issue | Detail |
|-------|--------|
| Examination fields | 2 large textareas: "General Examination Findings" + "Detailed Physical Examination" |
| No structured data | Zero dropdowns, checkboxes, or selects for examination |
| No default normal values | Doctor must type everything from scratch |
| No systems review | No structured CVS/Resp/Abdo/CNS sections |
| No "Mark All Normal" | Missing entirely |

**Impact:** GOPD is the highest-volume clinic. Every patient encounter requires typing paragraphs of free text. This is the single biggest usability problem in the EMR.

**Required Improvements:**
1. Create a `GOPD_TEMPLATE` with structured general examination sections
2. Add General Appearance (dropdown with defaults)
3. Add structured systems review: CVS, Respiratory, Abdominal, CNS, MSK — each with Normal/Abnormal radio + conditional detail fields
4. Add "Mark All Normal" button that pre-fills all systems as Normal
5. Keep one "Additional Findings" textarea for edge cases

---

### 2.2 Cardiology

**Rating:** 🟢 **Good — Best Template**

| Metric | Value |
|--------|-------|
| Sections | 8 (General, Pulse/BP, Peripheral Pulses, Precordium, Murmurs, Chest, Abdomen, Functional) |
| Fields | ~54 |
| Structured fields | ~95% (select, radio, checkbox_group) |
| Conditional logic | ✅ Used (edema location, murmur details) |
| Smart defaults | ❌ Missing |
| Mark All Normal | ❌ Missing |

**Strengths:**
- Excellent clinical coverage (NYHA, murmur grading, peripheral pulses, JVP)
- Good use of conditional fields (murmur details only shown when murmur_present = yes)
- Detailed Levine scale for murmur grading
- Proper clinical impression options

**Weaknesses:**
- No smart defaults (absent/normal should be pre-selected)
- No "Mark All Normal" button
- BP re-entry redundant with vitals (already captured in triage/vitals step)
- Peripheral pulse assessment (10 individual selects) could be streamlined into a table/grid component
- Missing: Auscultation position (sitting forward for AR), Ankle-Brachial Index, ECG interpretation section

**Required Improvements:**
1. Add smart defaults: JVP → Normal, Edema → None, Murmur → No, Ascites → None
2. Add "Quick Normal Cardio Exam" button
3. Add ECG interpretation sub-section (Rhythm, Rate, Axis, Intervals, ST changes — all structured)
4. Add Functional Assessment: 6-Minute Walk Distance (optional number field)
5. Remove duplicate BP fields (already in vitals step)

---

### 2.3 Dermatology

**Rating:** 🟢 **Good**

| Metric | Value |
|--------|-------|
| Sections | 5+ (Lesion Description, Distribution, Secondary Changes, Nails/Hair, Clinical Impression) |
| Fields | ~37 |
| Structured fields | ~90% |
| Measurement type | ✅ Used (lesion size in cm) |

**Strengths:**
- Comprehensive morphological assessment (lesion type, color, shape, surface)
- Body region distribution mapping
- Clinical impression with common Nigerian dermatoses

**Weaknesses:**
- No smart defaults
- Missing: Dermoscopy findings section (conditional on dermoscope available)
- Missing: Photo documentation prompt/reference
- Missing: Common Nigerian conditions as quick-select: Tinea (very common), Pityriasis versicolor, Post-inflammatory hyperpigmentation, Keloid, Eczema, Chronic paronychia
- Nail examination section could add onychomycosis grading

**Required Improvements:**
1. Add smart defaults for general examination fields
2. Add "Quick Common Conditions" template buttons (Tinea, Eczema, Acne, Urticaria)
3. Add dermoscopy findings section (conditional)
4. Add "Photo Reference" checkbox field

---

### 2.4 Orthopaedics

**Rating:** 🟡 **Fair — Needs Expansion**

| Metric | Value |
|--------|-------|
| Sections | ~3 |
| Fields | ~15 |
| Structured fields | ~70% |

**Weaknesses:**
- Relatively thin compared to other surgical specialties
- Missing: Joint-specific examination templates (Shoulder, Knee, Hip, Spine)
- Missing: Special tests (McMurray, Lachman, Drawer, Neer, Hawkins, Thomas, Trendelenburg)
- Missing: Range of Motion documentation (structured numeric fields)
- Missing: Neurovascular status (pulses, sensation, motor)
- Missing: Fracture classification (open/closed, displacement, comminution)
- Missing: Spine examination (SLRT, Schober's test, neurological level)
- Missing: Gait assessment

**Required Improvements:**
1. Add Joint Selection field (which joint is being examined) with conditional sections
2. Add structured ROM fields (Flexion/Extension/Abduction/Adduction/Rotation — numeric with normal ranges)
3. Add Special Tests section with per-joint test checklists
4. Add Neurovascular Status section
5. Add Fracture Description section (conditional)
6. Add Gait Assessment (dropdown: normal, antalgic, Trendelenburg, etc.)
7. Add "Normal Joint Exam" quick button

---

### 2.5 ENT

**Rating:** 🟢 **Good**

| Metric | Value |
|--------|-------|
| Sections | 5+ (Ear, Nose, Throat, Neck, Hearing/Voice) |
| Fields | ~30+ |
| Structured fields | ~90% |

**Strengths:**
- Bilateral ear examination (Right/Left separate)
- Tuning fork tests (Rinne/Weber)
- Good throat/oral cavity coverage

**Weaknesses:**
- Missing: Flexible nasopharyngoscopy findings (conditional)
- Missing: Audiometry summary section
- Missing: Vestibular assessment (Dix-Hallpike, Head Impulse)
- Missing: Facial nerve assessment (House-Brackmann scale)
- Missing smart defaults (TM → Intact, Hearing → Normal)

**Required Improvements:**
1. Add smart defaults: TM → Intact bilateral, External ear → Normal bilateral
2. Add Vestibular Assessment section (dizziness patients)
3. Add Facial Nerve section with House-Brackmann scale (radio 1-6)
4. Add Audiometry Summary section (conditional on audiogram available)

---

### 2.6 Urology

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: DRE (Digital Rectal Examination) — mandatory for prostate assessment
- Missing: IPSS score (International Prostate Symptom Score) — should be a scale field
- Missing: Testicular examination (bilateral structured)
- Missing: Urethral meatus inspection
- Missing: Inguinoscrotal examination
- Missing: Common Nigerian presentations: BPH staging, urethral stricture, bladder tumour grading

**Required Improvements:**
1. Add DRE section (prostate size, consistency, nodularity, tenderness)
2. Add IPSS score using `scale` field type (0-35)
3. Add Testicular Examination section (bilateral)
4. Add Inguinoscrotal Examination section
5. Add Urethral Meatus inspection findings
6. Add smart defaults for general fields

---

### 2.7 Gynaecology

**Rating:** 🟢 **Good — Well-Structured**

| Metric | Value |
|--------|-------|
| Sections | 10 (General, Abdomen, Vulva, Speculum, Bimanual, Rectovaginal, Breast, Consent, Investigations, Impression) |
| Fields | ~30+ |
| Conditional logic | ✅ Excellent (discharge types, breast exam, rectovaginal, fundal height) |
| Consent section | ✅ Medico-legal (chaperone documentation) |

**Strengths:**
- Excellent Nigerian clinical context (HVS swabs, PID red flags, cervical motion tenderness)
- Strong conditional logic usage
- Consent/chaperone section (medico-legal best practice)
- Red flags section (ectopic, torsion, malignancy, sepsis)

**Weaknesses:**
- Missing: Menstrual history fields (LMP, cycle length, menstrual pattern — should be in history but often needed in exam)
- Missing: Pregnancy test result field (common requirement before procedures)
- Missing: VIA/VILI findings for cervical screening
- Missing: Endometrial biopsy/sampling performed checkbox
- Missing smart defaults (General appearance → Well looking, Pallor → Absent)

**Required Improvements:**
1. Add smart defaults for general examination
2. Add VIA/VILI screening section
3. Add pregnancy test result quick field (Positive/Negative/Not done)
4. Add "Quick Normal Gynae Exam" button
5. Add Menstrual History quick-reference (LMP, regularity)

---

### 2.8 General Surgery

**Rating:** 🟢 **Good**

| Metric | Value |
|--------|-------|
| Sections | 7+ (General, Abdomen, Hernia, Mass/Wound, Breast, PR, Vascular) |
| Fields | ~40+ |
| Conditional logic | ✅ Used (hernia details, wound details) |

**Strengths:**
- Comprehensive abdominal examination (inspection/palpation/percussion/auscultation)
- Hernia examination with detailed conditional fields (site, reducibility, cough impulse, strangulation)
- PR examination section
- Appropriate for Nigerian surgical practice

**Weaknesses:**
- Missing: Wound grading (clean/clean-contaminated/contaminated/dirty)
- Missing: Thyroid examination section (very common in Nigerian surgery)
- Missing: ASA classification for pre-operative assessment
- Missing smart defaults

**Required Improvements:**
1. Add Thyroid Examination section (common in Nigerian general surgery)
2. Add Wound Classification (Altemeier)
3. Add ASA physical status classification
4. Add smart defaults for general examination
5. Add "Quick Normal Abdomen" button

---

### 2.9 Paediatrics

**Rating:** 🟢 **Good**

| Metric | Value |
|--------|-------|
| Sections | 7+ (General, Growth, Development, Systemic, Fontanelle, Feeding, Impression) |
| Fields | ~48 |
| Conditional logic | ✅ Used (developmental assessment, fontanelle) |

**Strengths:**
- Growth parameters (weight/height for age, head circumference, growth trend)
- Developmental milestones (gross/fine motor, speech, social)
- Age-appropriate conditional fields (fontanelle for infants)
- Nutritional/hydration status

**Weaknesses:**
- Missing: MUAC (Mid-Upper Arm Circumference) — critical in Nigerian malnutrition screening
- Missing: Immunization status review
- Missing: Breastfeeding assessment (for infants)
- Missing: IMCI danger signs checklist (very important in LMIC settings)
- Missing: Malaria/Fever assessment protocol
- Missing: Neonatal examination sections (Apgar, reflexes, congenital anomalies) — conditional on age
- Missing: WHO Z-scores instead of just qualitative weight-for-age
- Missing smart defaults

**Required Improvements:**
1. Add MUAC field (number, conditional on age 6mo-5yr)
2. Add IMCI Danger Signs checklist (convulsions, inability to drink, persistent vomiting, lethargy)
3. Add Immunization Status section (up-to-date / incomplete / unknown)
4. Add Neonatal Section (conditional on age <28 days)
5. Add Breastfeeding Assessment (conditional on age <2 years)
6. Add smart defaults for systemic examination (all Normal)

---

### 2.10 Neurology

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Cranial nerve examination (should be 12 nerve systematic assessment)
- Missing: Motor examination (power grading 0-5 per limb, tone, reflexes)
- Missing: Sensory examination (light touch, pain, proprioception, vibration)
- Missing: Cerebellar examination (finger-nose, heel-shin, dysdiadochokinesia)
- Missing: Gait assessment
- Missing: GCS (Glasgow Coma Scale) — critical for acute neurology
- Missing: NIHSS (National Institutes of Health Stroke Scale) for stroke assessment

**Required Improvements:**
1. Add Cranial Nerves I-XII structured checklist (Normal/Abnormal per nerve with conditional detail)
2. Add Motor Examination (power scale 0-5, tone, reflexes per limb)
3. Add Sensory Examination (structured per modality)
4. Add Cerebellar Examination section
5. Add GCS calculator
6. Add NIHSS scale (for stroke patients — conditional)
7. Add Gait Assessment (dropdown)
8. Add smart defaults: All cranial nerves → Normal, Power → 5/5 all limbs

---

### 2.11 Neuropsychiatry

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Mental State Examination (MSE) — the core of psychiatric evaluation
  - Appearance & Behaviour
  - Speech
  - Mood & Affect
  - Thought Form & Content
  - Perception
  - Cognition (orientation, memory, attention)
  - Insight & Judgment
- Missing: Risk Assessment (suicidal ideation, self-harm, violence)
- Missing: Standardized screening tools (PHQ-9, GAD-7)
- Missing: Substance use screening

**Required Improvements:**
1. Add full Mental State Examination with structured selects for each domain
2. Add Risk Assessment section (suicidal ideation scale, self-harm, violence risk)
3. Add PHQ-9 Depression Screening (scale 0-27)
4. Add GAD-7 Anxiety Screening (scale 0-21)
5. Add Substance Use section
6. Add Cognitive Assessment (MMSE/MoCA score fields)

---

### 2.12 Gastroenterology

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Liver examination details (size, consistency, span)
- Missing: Ascites grading with shifting dullness
- Missing: Spider naevi, palmar erythema, gynaecomastia (chronic liver disease signs)
- Missing: Child-Pugh score calculator
- Missing: PR examination for GI bleed
- Missing: Nutritional assessment (BMI, albumin status)

**Required Improvements:**
1. Add Chronic Liver Disease Signs checklist (spider naevi, palmar erythema, caput medusae, etc.)
2. Add Child-Pugh Score calculator (scale field)
3. Add PR Examination section
4. Add Nutritional Assessment
5. Add smart defaults

---

### 2.13 Nephrology

**Rating:** 🟡 **Fair**

| Metric | Value |
|--------|-------|
| Fields | ~45 |

**Weaknesses:**
- Missing: AV Fistula examination (for dialysis patients — extremely important)
- Missing: Peritoneal dialysis catheter assessment
- Missing: Fluid status assessment (structured: JVP, edema, lung bases, weight)
- Missing: Renal replacement therapy history section

**Required Improvements:**
1. Add AV Fistula Examination section (thrill, bruit, maturity, steal signs)
2. Add Dialysis Access Assessment
3. Add Fluid Balance section (structured JVP + edema + lung bases)
4. Add smart defaults

---

### 2.14 Pulmonology

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Chest shape inspection (barrel chest, pectus excavatum/carinatum)
- Missing: Tracheal position
- Missing: Percussion note per zone
- Missing: Breath sounds per zone (bilateral comparison)
- Missing: Peak Flow / FEV1 quick entry
- Missing: MRC Dyspnea Scale
- Missing: Oxygen requirement documentation

**Required Improvements:**
1. Add Chest Inspection section (chest shape, symmetry, scars, trachea position)
2. Add Zone-by-zone Auscultation (upper/mid/lower, bilateral)
3. Add MRC Dyspnea Scale (structured 1-5)
4. Add Peak Flow / Spirometry summary fields
5. Add Oxygen Requirement section
6. Add smart defaults (Chest → Symmetrical, Trachea → Central, Percussion → Resonant)

---

### 2.15 Endocrinology

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Thyroid examination (size, consistency, nodularity, tenderness, bruit)
- Missing: Diabetic foot examination (very common in Nigeria)
- Missing: Peripheral neuropathy screening (monofilament, vibration)
- Missing: Eye complications screening (visual acuity)
- Missing: BMI calculation
- Missing: Acanthosis nigricans, skin tags, striae (insulin resistance signs)

**Required Improvements:**
1. Add Thyroid Examination section (MANDATORY — most common endocrine referral)
2. Add Diabetic Foot Examination (pulses, sensation, ulcers, deformity — CRITICAL in Nigeria)
3. Add Insulin Injection Sites inspection
4. Add BMI calculation fields
5. Add Peripheral Neuropathy Screening (monofilament, vibration)
6. Add smart defaults

---

### 2.16 Neurosurgery

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: GCS (Glasgow Coma Scale) — MANDATORY for neurosurgery
- Missing: Pupil assessment (size, reactivity, bilateral comparison)
- Missing: Spinal cord injury level assessment
- Missing: Cranial nerve examination
- Missing: Power/Tone per limb

**Required Improvements:**
1. Add GCS calculator (E1-4/V1-5/M1-6 with auto-total)
2. Add Pupil Assessment (size in mm, reactivity, bilateral)
3. Add Motor Power grading per limb (MRC 0-5)
4. Add Spinal Level Assessment (conditional on spinal pathology)
5. Add Wound/Surgical Site examination

---

### 2.17 Plastic Surgery

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Wound/Scar assessment (Vancouver Scar Scale)
- Missing: Burns assessment (TBSA percentage, depth)
- Missing: Skin graft assessment
- Missing: Flap viability assessment (color, temperature, capillary refill)

**Required Improvements:**
1. Add Burns Assessment section (TBSA %, depth — partial/full thickness, location)
2. Add Scar Assessment (Vancouver Scar Scale)
3. Add Flap Assessment section
4. Add Wound Bed Assessment (granulation, slough, necrosis)

---

### 2.18 OMFS (Oral & Maxillofacial Surgery)

**Rating:** 🟡 **Fair**

**Weaknesses:**
- Missing: Dental charting reference
- Missing: TMJ clicking/crepitus/locking
- Missing: Occlusion classification (Angle)
- Missing: Mandibular fracture assessment

**Required Improvements:**
1. Add TMJ Examination details (ROM, clicking, locking, crepitus)
2. Add Occlusion Assessment
3. Add Fracture Site mapping

---

### 2.19 Ophthalmology

**Rating:** ❌ **Placeholder Only**

Currently has only generic textarea fields. Needs a complete template.

**Required Fields (New Template):**
1. Visual Acuity (distance/near, bilateral, with/without correction)
2. Pupil examination (size, shape, RAPD)
3. Anterior Segment (conjunctiva, cornea, anterior chamber, iris, lens)
4. Intraocular Pressure (bilateral numeric)
5. Fundoscopy (disc, cup-disc ratio, macula, vessels, retina)
6. Extra-ocular movements
7. Visual Fields (confrontation)
8. Slit Lamp findings
9. Colour Vision
10. Red Flag conditions (acute angle closure, retinal detachment, CRAO/CRVO)

---

## 3. Cross-Cutting Improvements Required

### 3.1 "Mark All Normal" Button — HIGHEST PRIORITY

**Every** specialty template must have a "Quick Normal Examination" button that:
- Pre-fills all general examination fields with normal/absent defaults
- Pre-fills all systemic examination fields with normal defaults
- Allows the doctor to then modify only abnormal findings
- Reduces clerking time by 60-80% for routine patients

**Implementation:** Add a `defaultNormalValues` map per template that the renderer can apply in one click.

### 3.2 Smart Defaults — HIGH PRIORITY

Every template needs default values for common normal findings:
- General Appearance → Well looking
- Pallor → Absent
- Jaundice → Absent
- Fever → Absent
- Pedal Edema → Absent
- Dehydration → Absent
- Lymphadenopathy → Absent

**Implementation:** Add a `default_value` property to `SpecialtyTemplateField` and apply it during form initialization.

### 3.3 GOPD Template — HIGH PRIORITY

Create a structured GOPD examination template to replace the current free-text approach. This affects the highest volume of patients.

### 3.4 Ophthalmology Template — HIGH PRIORITY

Create a full ophthalmology examination template replacing the placeholder.

### 3.5 Clinical Scoring Systems

Add standardized clinical scores as reusable field groups using the `scale` field type:
- **NYHA** (already in Cardiology)
- **GCS** (Neurosurgery, Emergency, Neurology)
- **NIHSS** (Neurology)
- **PHQ-9** (Neuropsychiatry)
- **GAD-7** (Neuropsychiatry)
- **IPSS** (Urology)
- **Child-Pugh** (Gastroenterology)
- **MRC Dyspnea** (Pulmonology)
- **MUAC-for-Age** (Paediatrics)
- **IMCI Danger Signs** (Paediatrics)
- **Vancouver Scar Scale** (Plastic Surgery)
- **House-Brackmann** (ENT)

### 3.6 Nigerian Clinical Context Additions

Ensure all templates account for commonly encountered conditions in Nigeria:

| Specialty | Common Nigerian Presentations to Support |
|-----------|----------------------------------------|
| Paediatrics | Malaria, malnutrition (SAM/MAM), sickle cell crises, neonatal sepsis, AGE with dehydration |
| General Surgery | Inguinal hernia (very common), appendicitis, intestinal obstruction, breast lumps |
| Gynaecology | PID, fibroids, ectopic pregnancy, infertility, STIs, cervical cancer screening |
| Endocrinology | Diabetic foot, thyroid disorders (goitre belt), diabetic ketoacidosis |
| Nephrology | CKD (very prevalent), nephrotic syndrome, dialysis access issues |
| Ophthalmology | Glaucoma (leading cause of blindness), cataract, trachoma, allergic conjunctivitis |
| Orthopaedics | RTA trauma, osteomyelitis, bone tumours, sickle cell bone crises |
| ENT | CSOM, foreign bodies, nasopharyngeal carcinoma |
| Dermatology | Tinea, eczema, post-inflammatory hyperpigmentation, keloids |
| Neurology | Stroke, meningitis, epilepsy, HIV-related neurological conditions |

---

## 4. Technical Implementation Plan

### Phase 1 — Framework Enhancement (Renderer + Template System)

| Task | Description | Impact |
|------|-------------|--------|
| **Add `default_value` to field schema** | New optional property on `SpecialtyTemplateField` | Foundation for smart defaults |
| **Add `normal_values` map to template** | Per-template map of field_code → normal value | Foundation for "Mark All Normal" |
| **Add "Mark All Normal" button in renderer** | Button in `SpecialtyExaminationRenderer` header that applies normal_values | HIGH — biggest usability win |
| **Add per-section "Mark Normal" button** | Each section header gets a "Normal" quick button | Medium |
| **Optimize `scale` field renderer** | Currently unused — ensure it renders as a visual slider/radio set | Medium |

### Phase 2 — GOPD Template + Ophthalmology Template (New)

| Task | Description |
|------|-------------|
| Create `GOPD_TEMPLATE` | General Appearance, Vitals Summary, Systems Review (CVS/Resp/Abdo/CNS/MSK), Additional Findings |
| Create `OPHTHALMOLOGY_TEMPLATE` | Full eye examination (VA, pupil, anterior segment, IOP, fundus, EOM, visual fields) |
| Wire GOPD into ConsultationWizard | Detect GOPD/MOPD clinics and load GOPD template instead of free-text |

### Phase 3 — Template Improvements (Existing 17 Templates)

For each existing template:
1. Add `default_value` to all normal fields
2. Add `normal_values` map for "Mark All Normal"
3. Add missing clinical fields identified in audit
4. Add Nigerian clinical context fields
5. Add clinical scoring systems where applicable
6. Reduce required fields to minimum essential set (currently too many fields marked required)

### Phase 4 — Template Quick Patterns (Optional Enhancement)

Add per-specialty "Quick Templates" — pre-configured examination findings for common presentations:

**Example (Gynaecology):**
- "Normal Gynae Exam" — all fields normal
- "PID Pattern" — fever present, cervical motion tenderness, adnexal tenderness bilateral, purulent discharge
- "Fibroid Pattern" — palpable uterus, enlarged, firm

**Implementation:** Add a `quick_patterns` array to template with named presets.

---

## 5. Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | "Mark All Normal" button in renderer | Small | Massive — saves 60%+ typing |
| 🔴 P0 | Smart defaults (`default_value`) on all fields | Medium | Large — pre-filled normal values |
| 🔴 P0 | GOPD Template (new) | Medium | Large — highest volume clinic |
| 🟠 P1 | Ophthalmology Template (new) | Medium | High — only placeholder left |
| 🟠 P1 | Add missing sections to Neurology, Neuropsychiatry, Orthopaedics | Large | High — most incomplete templates |
| 🟡 P2 | Add clinical scoring systems (GCS, NIHSS, PHQ-9, etc.) | Medium | Medium |
| 🟡 P2 | Add Nigerian-specific fields (MUAC, IMCI, diabetic foot, etc.) | Medium | Medium |
| 🟢 P3 | Quick Templates / Pattern presets | Medium | Nice to have |
| 🟢 P3 | Optimize scale/measurement field renderers | Small | Quality of life |

---

## 6. Expected Outcome

After implementing these improvements:

| Metric | Before | After |
|--------|--------|-------|
| GOPD exam documentation time | 3-5 min typing | 30-60 sec (click defaults, modify abnormals) |
| Specialty exam structured data | 60-70% | 95%+ |
| Fields with smart defaults | 0% | 80%+ |
| "Mark All Normal" availability | 0 templates | All 19 templates |
| Clinical scoring systems | 1 (NYHA) | 12+ |
| Ophthalmology coverage | Placeholder | Full template |
| Nigerian clinical context | Partial | Comprehensive |
| Active conditional logic | ~5 templates | All 19 templates |

---

*Generated by EMR Systems Architecture Analysis — March 4, 2026*
