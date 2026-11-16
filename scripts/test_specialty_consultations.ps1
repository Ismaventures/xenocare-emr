# =============================================================================
# PowerShell Script: Test All 18 Specialty Consultation Form Submissions
# =============================================================================
# Simulates inserting consultation records for all 18 specialty clinics
# and verifies each field is properly stored in the database.
#
# Flow: Insert -> Read Back -> Verify Fields -> Cleanup
# =============================================================================

# --- Load environment ---
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim() -ErrorAction SilentlyContinue
        }
    }
}

$SupabaseUrl = $env:SUPABASE_URL
$SupabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Host "[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

$headers = @{
    "apikey"        = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  SPECIALTY CONSULTATION FORM SUBMISSION TEST" -ForegroundColor Cyan
Write-Host "  Testing all 18 specialties - Insert, Verify, Cleanup" -ForegroundColor Gray
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ("=" * 80) -ForegroundColor Cyan

# =============================================================================
# SETUP: Find a valid encounter + patient
# =============================================================================
Write-Host "`n[SETUP] Finding test encounter and patient..." -ForegroundColor Yellow

# Get most recent visit
$visit = (Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/visits?select=id,visit_id,patient_id&order=created_at.desc&limit=1" -Headers $headers)[0]
$encounterId = $visit.id
$visitDisplayId = $visit.visit_id
$patientUuid = $visit.patient_id
Write-Host "  Encounter: $visitDisplayId ($encounterId)" -ForegroundColor Gray

# Resolve patient display ID (consultations.patient_id FK -> patients.patient_id)
$pat = (Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/patients?id=eq.$patientUuid&select=id,patient_id,first_name,surname" -Headers $headers)[0]
$patientDisplayId = $pat.patient_id
Write-Host "  Patient: $($pat.first_name) $($pat.surname) (patient_id: $patientDisplayId)" -ForegroundColor Gray

# =============================================================================
# Define all 18 specialties with examination data
# =============================================================================

$specialties = @(
    @{
        code = "CARDIOLOGY"; name = "Cardiology"
        exam = '{"chest_pain":"Typical angina, substernal","cardiac_history":"Previous MI 2020","heart_sounds":"S1/S2 normal, no murmurs","jvp":"Normal","peripheral_pulses":"2+ bilaterally","bp_sitting":"130/85","bp_standing":"128/82","ecg":"Normal sinus rhythm","risk":"Moderate cardiovascular risk"}'
        diagnosis = "I25.1 - Atherosclerotic heart disease"
        treatment = "Aspirin 81mg daily, atorvastatin 40mg"
        complaints = "Chest pain on exertion, 3-day history"
        hpi = "58yo male with exertional chest pain radiating to left arm"
    },
    @{
        code = "DERMATOLOGY"; name = "Dermatology"
        exam = '{"lesion_location":"Right forearm","lesion_size":"2cm x 1.5cm","color":"Erythematous","border":"Well-defined","texture":"Scaly","distribution":"Localized","nails":"Normal","hair":"Normal"}'
        diagnosis = "L40.0 - Psoriasis vulgaris"
        treatment = "Topical corticosteroid cream BID, moisturizer"
        complaints = "Itchy, scaly patch on forearm for 2 weeks"
        hpi = "Patient noticed red scaly patch on right forearm, progressively enlarging"
    },
    @{
        code = "ORTHOPAEDICS"; name = "Orthopaedics"
        exam = '{"joint":"Right knee","rom":"0-120 degrees","swelling":"Mild effusion","tenderness":"Medial joint line","stability":"Stable varus/valgus","gait":"Antalgic","muscle_strength":"4/5 quads, 5/5 hamstrings","mcmurray":"Negative","lachman":"Negative"}'
        diagnosis = "M17.11 - Primary osteoarthritis, right knee"
        treatment = "NSAIDs, physical therapy, consider injection"
        complaints = "Right knee pain and stiffness, worse with stairs"
        hpi = "Progressive knee pain over 6 months, worse with weight bearing"
    },
    @{
        code = "ENT"; name = "ENT (Ear, Nose, Throat)"
        exam = '{"external_ear":"Normal","tm_right":"Intact, no effusion","tm_left":"Intact, no effusion","hearing":"Normal whisper bilaterally","septum":"Midline","turbinates":"Mildly congested","nasal_discharge":"Clear mucoid","tonsils":"Grade 1","pharynx":"Mildly erythematous","uvula":"Midline"}'
        diagnosis = "J31.0 - Chronic rhinitis"
        treatment = "Nasal corticosteroid spray, saline irrigation"
        complaints = "Persistent nasal congestion and post-nasal drip"
        hpi = "3-month history of nasal congestion with clear discharge"
    },
    @{
        code = "UROLOGY"; name = "Urology"
        exam = '{"urological_history":"Nocturia x3, weak stream","frequency":"10-12/day","urgency":"Moderate","hesitancy":"Present","incomplete_emptying":"Yes","ipss_score":18,"abdomen":"Soft, non-tender","genitalia":"Normal","dre":"Prostate enlarged, smooth, non-tender"}'
        diagnosis = "N40.1 - BPH with LUTS"
        treatment = "Tamsulosin 0.4mg daily, lifestyle modifications"
        complaints = "Difficulty urinating, frequent nighttime urination"
        hpi = "65yo male with progressive urinary symptoms over past year"
    },
    @{
        code = "NEUROLOGY"; name = "Neurology"
        exam = '{"cn_ii":"VA 20/20, fields full","cn_iii_iv_vi":"PERRL, EOM intact","cn_v":"Sensation intact","cn_vii":"Symmetric","motor_ue":"5/5 bilat","motor_le":"5/5 bilat","tone":"Normal","sensory":"LT/PP/proprioception intact","reflexes":"2+ symmetric","coordination":"FTN/HTS intact","gait":"Normal tandem"}'
        diagnosis = "G43.909 - Migraine, unspecified"
        treatment = "Sumatriptan PRN, propranolol prophylaxis"
        complaints = "Recurrent severe headaches with aura"
        hpi = "Patient reports throbbing headaches 3x/month with visual aura"
    },
    @{
        code = "NEUROPSYCHIATRY"; name = "Neuropsychiatry"
        exam = '{"appearance":"Well-groomed","behavior":"Cooperative, good eye contact","speech":"Normal rate/rhythm/volume","mood":"Anxious","affect":"Congruent, mildly restricted","thought_process":"Linear, goal-directed","thought_content":"No SI/HI, no delusions","perception":"No hallucinations","cognition":"A and O x4","insight":"Good","judgment":"Intact","mmse":"28/30"}'
        diagnosis = "F41.1 - Generalized anxiety disorder"
        treatment = "Sertraline 50mg daily, CBT referral"
        complaints = "Excessive worry, difficulty sleeping, restlessness"
        hpi = "6-month history of persistent anxiety affecting daily function"
    },
    @{
        code = "GASTROENTEROLOGY"; name = "Gastroenterology"
        exam = '{"inspection":"No distension","auscultation":"Normal bowel sounds","percussion":"Tympanic","palpation":"Soft, mild epigastric tenderness","liver":"Not enlarged","spleen":"Not palpable","gi_history":"Epigastric pain with meals","alarm_symptoms":"No weight loss, melena, dysphagia","bmi":24}'
        diagnosis = "K21.0 - GERD with esophagitis"
        treatment = "Omeprazole 20mg BID, dietary modifications"
        complaints = "Heartburn and epigastric pain after meals"
        hpi = "Burning epigastric pain for 4 weeks, worse after spicy food"
    },
    @{
        code = "NEPHROLOGY"; name = "Nephrology"
        exam = '{"renal_history":"CKD stage 3, HTN, DM2","edema":"1+ pedal bilateral","jvp":"Normal","lungs":"Clear","bp":"145/92","urinalysis":"Proteinuria 2+","creatinine":1.8,"egfr":42,"bun":28}'
        diagnosis = "N18.3 - CKD Stage 3"
        treatment = "ACE inhibitor, dietary protein restriction"
        complaints = "Leg swelling, fatigue, elevated creatinine"
        hpi = "Known CKD patient with worsening pedal edema and fatigue"
    },
    @{
        code = "PAEDIATRICS"; name = "Paediatrics"
        exam = '{"weight":"15kg","height":"100cm","weight_pct":"50th","height_pct":"50th","head_circ":"50cm","gross_motor":"Age appropriate","fine_motor":"Age appropriate","language":"Age appropriate","social":"Age appropriate","immunizations":"Up to date","feeding":"Normal","general":"Active, playful"}'
        diagnosis = "J06.9 - Acute upper respiratory infection"
        treatment = "Supportive care, antipyretics PRN"
        complaints = "Fever, cough, runny nose for 2 days"
        hpi = "4-year-old with acute onset fever and upper respiratory symptoms"
    },
    @{
        code = "NEUROSURGERY"; name = "Neurosurgery"
        exam = '{"gcs":15,"pupils":"Equal, reactive","motor":"5/5 all extremities","sensory":"Intact","spine_inspection":"No deformity","spine_palpation":"Tenderness L4-L5","rom":"Limited flexion","slr":"Positive right 45 deg","mri":"L4-L5 disc herniation","surgical_candidacy":"Conservative first"}'
        diagnosis = "M51.16 - Lumbar disc herniation with radiculopathy"
        treatment = "Physical therapy, NSAIDs, epidural steroid injection"
        complaints = "Low back pain radiating to right leg"
        hpi = "Progressive low back pain with right leg radiculopathy for 3 months"
    },
    @{
        code = "GENERAL_SURGERY"; name = "General Surgery"
        exam = '{"surgical_history":"Appendectomy 2015","inspection":"RLQ scar","palpation":"Reducible RIH, cough impulse","hernia":"Right inguinal, 3cm defect","wound":"N/A new presentation","asa_score":2,"cv_clearance":"Obtained","anesthesia":"Pending"}'
        diagnosis = "K40.90 - Inguinal hernia, unilateral, no obstruction"
        treatment = "Elective herniorrhaphy, pre-op workup"
        complaints = "Groin swelling, worse with coughing"
        hpi = "6-month history of intermittent right groin bulge"
    },
    @{
        code = "GYNAECOLOGY"; name = "Gynaecology"
        exam = '{"lmp":"2026-01-20","cycle_length":28,"duration":5,"flow":"Moderate","dysmenorrhea":"Mild","obstetric":"G2P2","ext_genitalia":"Normal","vagina":"Normal rugae","cervix":"Parous os, no lesions","uterus":"Normal, anteverted","adnexa":"No masses","breasts":"No masses, no discharge"}'
        diagnosis = "N92.0 - Excessive menstruation with regular cycle"
        treatment = "Hormonal contraceptive, iron supplementation"
        complaints = "Heavy menstrual bleeding for 3 months"
        hpi = "Regular cycles but increasingly heavy flow requiring pad changes q2h"
    },
    @{
        code = "ORAL_MAXILLOFACIAL"; name = "Oral and Maxillofacial Surgery"
        exam = '{"mouth_opening":"40mm","tmj":"No clicking, no tenderness","dentition":"Impacted third molars bilateral","soft_tissue":"Normal mucosa","facial_symmetry":"Symmetric","swelling":"Mild right cheek","lymph":"None","radiograph":"Impacted 18/28 mesioangular"}'
        diagnosis = "K01.1 - Impacted teeth"
        treatment = "Surgical extraction of impacted third molars"
        complaints = "Pain in back of jaw, difficulty opening mouth"
        hpi = "Recurrent pericoronitis around impacted wisdom teeth"
    },
    @{
        code = "PULMONOLOGY"; name = "Pulmonology"
        exam = '{"respiratory_history":"Chronic cough, DOE","smoking":"20 pack-years, quit 2020","chest_inspection":"Normal","fremitus":"Normal","percussion":"Resonant bilat","auscultation":"Scattered wheezes, no crackles","fev1":68,"fvc":82,"fev1_fvc":0.65,"spo2":95}'
        diagnosis = "J44.9 - COPD, unspecified"
        treatment = "LABA/LAMA inhaler, pulmonary rehabilitation"
        complaints = "Chronic cough and shortness of breath on exertion"
        hpi = "Ex-smoker with progressive dyspnea and productive cough"
    },
    @{
        code = "ENDOCRINOLOGY"; name = "Endocrinology"
        exam = '{"endocrine_hx":"DM2 x10 years, hypothyroidism","thyroid_size":"Normal","thyroid_nodules":"None","thyroid_tender":"None","pulses":"2+","monofilament":"Decreased both feet","foot_ulcers":"None, calluses present","hba1c":7.8,"tsh":2.5,"ldl":110,"hdl":45,"tg":180}'
        diagnosis = "E11.65 - Type 2 DM with hyperglycemia"
        treatment = "Increase metformin, add SGLT2 inhibitor, podiatry referral"
        complaints = "Uncontrolled blood sugar, tingling in feet"
        hpi = "Known diabetic with rising HbA1c and early neuropathy symptoms"
    },
    @{
        code = "PLASTIC_SURGERY"; name = "Plastic Surgery"
        exam = '{"wound_location":"Right hand dorsum","wound_size":"4cm x 2cm","depth":"Full thickness","wound_bed":"Granulating","edges":"Epithelializing","scar":"Hypertrophic from prior burn","function":"Limited finger extension","reconstruction":"Skin graft vs local flap"}'
        diagnosis = "T23.301A - Burn of third degree, right hand"
        treatment = "Wound care, compression therapy, surgical reconstruction"
        complaints = "Non-healing wound on right hand with limited movement"
        hpi = "Post-burn contracture with functional limitation"
    },
    @{
        code = "OPHTHALMOLOGY"; name = "Ophthalmology"
        exam = '{"va_right":"20/30","va_left":"20/25","va_corrected":"20/20 OU","iop_right":16,"iop_left":15,"cornea":"Clear","anterior_chamber":"Deep, quiet","lens":"Early nuclear sclerosis","disc":"Pink, sharp margins","vessels":"Normal A/V ratio","macula":"Normal foveal reflex","periphery":"No lesions"}'
        diagnosis = "H25.9 - Age-related cataract"
        treatment = "Update refraction, monitor annually, surgery when indicated"
        complaints = "Gradual blurring of vision, difficulty driving at night"
        hpi = "Progressive visual decline over 18 months, bilateral"
    }
)

# =============================================================================
# Run tests for each specialty
# =============================================================================

$testResults = @()
$createdIds = @()

Write-Host ""

foreach ($spec in $specialties) {
    Write-Host "[TEST] $($spec.name) ($($spec.code))" -ForegroundColor Yellow
    
    $result = @{
        name      = $spec.name
        code      = $spec.code
        inserted  = $false
        verified  = $false
        dataOk    = $false
        errors    = @()
    }
    
    $newId = [guid]::NewGuid().ToString()
    
    try {
        # --- INSERT ---
        $bodyObj = @{
            consultation_id            = $newId
            encounter_id               = $encounterId
            patient_id                 = $patientDisplayId
            visit_id                   = $visitDisplayId
            doctor_id                  = "STAFF-ADMIN-001"
            specialty_code             = $spec.code
            complaints                 = $spec.complaints
            history_of_present_illness = $spec.hpi
            diagnosis_text             = $spec.diagnosis
            treatment_plan             = $spec.treatment
            examination_findings       = $spec.exam
            physical_examination       = $spec.exam
            status                     = "Completed"
        }
        $body = $bodyObj | ConvertTo-Json -Compress
        
        $ins = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/consultations" -Headers $headers -Method Post -Body $body
        $result.inserted = $true
        $createdIds += $newId
        Write-Host "  [OK] Inserted" -ForegroundColor Green
        
        # --- VERIFY (read back) ---
        Start-Sleep -Milliseconds 150
        $readHeaders = @{
            "apikey"        = $SupabaseKey
            "Authorization" = "Bearer $SupabaseKey"
        }
        $recs = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/consultations?consultation_id=eq.$newId&select=*" -Headers $readHeaders
        $rec = if ($recs -is [array]) { $recs[0] } else { $recs }
        
        if (-not $rec -or -not $rec.consultation_id) {
            $result.errors += "Record not found after insert"
            Write-Host "  [FAIL] Not found on read-back" -ForegroundColor Red
        } else {
            $allOk = $true
            
            # Check each field
            $checks = @(
                @{ col = "specialty_code";             expect = $spec.code },
                @{ col = "diagnosis_text";             expect = $spec.diagnosis },
                @{ col = "treatment_plan";             expect = $spec.treatment },
                @{ col = "complaints";                 expect = $spec.complaints },
                @{ col = "history_of_present_illness"; expect = $spec.hpi },
                @{ col = "patient_id";                 expect = $patientDisplayId },
                @{ col = "visit_id";                   expect = $visitDisplayId },
                @{ col = "encounter_id";               expect = $encounterId },
                @{ col = "doctor_id";                  expect = "STAFF-ADMIN-001" },
                @{ col = "status";                     expect = "Completed" }
            )
            
            $passCount = 0
            foreach ($chk in $checks) {
                $actual = $rec.($chk.col)
                if ([string]$actual -eq [string]$chk.expect) {
                    $passCount++
                } else {
                    $allOk = $false
                    $result.errors += "$($chk.col): expected '$($chk.expect)' got '$actual'"
                    Write-Host "    [FAIL] $($chk.col): mismatch" -ForegroundColor Red
                }
            }
            
            # Check examination data stored
            $examStored = $false
            $examField = $rec.examination_findings
            $physField = $rec.physical_examination
            if ($examField -and "$examField".Length -gt 10) {
                $examStored = $true
            } elseif ($physField -and "$physField".Length -gt 10) {
                $examStored = $true
            }
            
            if ($examStored) {
                $passCount++
                $result.dataOk = $true
            } else {
                $result.errors += "Examination data not stored"
            }
            
            $result.verified = $allOk
            $totalChecks = $checks.Count + 1
            Write-Host "  [OK] Verified $passCount/$totalChecks fields" -ForegroundColor $(if ($allOk) { "Green" } else { "Yellow" })
        }
        
    } catch {
        $errMsg = $_.Exception.Message
        $result.errors += $errMsg
        Write-Host "  [ERROR] $errMsg" -ForegroundColor Red
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $detail = $reader.ReadToEnd()
            Write-Host "  [DETAIL] $detail" -ForegroundColor Red
            $result.errors += $detail
        } catch {}
    }
    
    $testResults += $result
}

# =============================================================================
# CLEANUP: Remove all test records
# =============================================================================
Write-Host "`n[CLEANUP] Removing $($createdIds.Count) test records..." -ForegroundColor Yellow
$cleanupFails = 0
foreach ($cid in $createdIds) {
    try {
        Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/consultations?consultation_id=eq.$cid" -Headers $headers -Method Delete | Out-Null
    } catch { $cleanupFails++ }
}
if ($cleanupFails -eq 0) {
    Write-Host "  All test records cleaned up" -ForegroundColor Green
} else {
    Write-Host "  $cleanupFails records failed to clean up" -ForegroundColor Yellow
}

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.inserted -and $_.verified }).Count
$partial = ($testResults | Where-Object { $_.inserted -and -not $_.verified }).Count
$failed = ($testResults | Where-Object { -not $_.inserted }).Count

Write-Host ""
Write-Host "  Total Specialties: $($testResults.Count)" -ForegroundColor White
Write-Host "  PASSED (all fields OK):  $passed" -ForegroundColor Green
Write-Host "  PARTIAL (insert OK):     $partial" -ForegroundColor Yellow
Write-Host "  FAILED (insert failed):  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Results table
Write-Host ("  {0,-30} {1,-10} {2,-10} {3,-10}" -f "Specialty", "Inserted", "Verified", "ExamData") -ForegroundColor Gray
Write-Host ("  " + ("-" * 70)) -ForegroundColor Gray

foreach ($r in $testResults) {
    $ic = if ($r.inserted)  { "[OK]" } else { "[X]" }
    $vc = if ($r.verified)  { "[OK]" } else { "[X]" }
    $dc = if ($r.dataOk)    { "[OK]" } else { "[X]" }
    $color = if ($r.inserted -and $r.verified) { "Green" }
             elseif ($r.inserted) { "Yellow" }
             else { "Red" }
    Write-Host ("  {0,-30} {1,-10} {2,-10} {3,-10}" -f $r.name, $ic, $vc, $dc) -ForegroundColor $color
}

# Show errors if any
$withErrors = $testResults | Where-Object { $_.errors.Count -gt 0 }
if ($withErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "  ERRORS:" -ForegroundColor Red
    foreach ($r in $withErrors) {
        Write-Host "    $($r.name):" -ForegroundColor Yellow
        foreach ($e in $r.errors) {
            $short = if ($e.Length -gt 120) { $e.Substring(0, 120) + "..." } else { $e }
            Write-Host "      - $short" -ForegroundColor Red
        }
    }
}

Write-Host ""
if ($passed -eq $testResults.Count) {
    Write-Host "  ** ALL 18 SPECIALTY CONSULTATIONS: PASSED **" -ForegroundColor Green
} elseif ($failed -eq 0) {
    Write-Host "  ** All inserts succeeded, some field verifications had issues **" -ForegroundColor Yellow
} else {
    Write-Host "  ** $failed specialties failed to insert - review errors **" -ForegroundColor Red
}
Write-Host "  Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
