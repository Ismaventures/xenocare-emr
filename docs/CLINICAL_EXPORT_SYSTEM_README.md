# NDC Medical Centre EMR - Clinical Export System

## Comprehensive Cross-Module Export Framework

### Version: 1.0.0
### Status: Planning Phase
### Last Updated: January 24, 2026

---

## 📋 Executive Summary

This document outlines the design and implementation plan for a **unified, standards-compliant clinical export system** for the NDC Medical Centre EMR. The system will enable complete patient journey exports across all clinical and administrative modules, following international healthcare data standards (HL7 FHIR, ICD-10, LOINC, SNOMED-CT) and designed for clinical analysis, audits, research, and management reporting.

---

## 🎯 Objectives

1. **Unified Patient Journey Exports** - Export complete patient records across all modules (Clinics, Nursing, Billing, Pharmacy, Radiology, Wards, Inpatients, Procedures)
2. **Standards Compliance** - Implement ICD-10, LOINC, CPT, ATC coding systems throughout
3. **Analytics-Ready Output** - Support statistical analysis, trends, and chart generation
4. **Multi-Format Support** - PDF (legal/clinical), Excel/CSV (analysis), JSON (integration)
5. **Audit-Ready Documentation** - Generate reports suitable for clinical review, legal defensibility, and health authority compliance

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLINICAL EXPORT SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     DATA AGGREGATION LAYER                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Patient  │ │ Clinical │ │ Nursing  │ │ Pharmacy │ │Radiology │  │   │
│  │  │  Core    │ │  Notes   │ │ Records  │ │  Orders  │ │ Imaging  │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │   │
│  │       │            │            │            │            │         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Billing  │ │  Wards   │ │Inpatient │ │Procedures│ │Laboratory│  │   │
│  │  │ Records  │ │  Beds    │ │Admissions│ │  OT/IR   │ │  Results │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │   │
│  │       └────────────┴────────────┴────────────┴────────────┘         │   │
│  │                              │                                       │   │
│  │                    ┌─────────▼─────────┐                            │   │
│  │                    │  UNIFIED PATIENT  │                            │   │
│  │                    │   JOURNEY DATA    │                            │   │
│  │                    └─────────┬─────────┘                            │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┼──────────────────────────────────────┐   │
│  │                    STANDARDS & CODING LAYER                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  ICD-10  │ │  LOINC   │ │   CPT    │ │   ATC    │ │ HL7 FHIR │  │   │
│  │  │ Diagnoses│ │Lab/Vitals│ │Procedures│ │  Drugs   │ │ Resources│  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┼──────────────────────────────────────┐   │
│  │                    ANALYTICS & STATISTICS ENGINE                    │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │   │
│  │  │    Clinical    │ │   Operational  │ │   Financial    │          │   │
│  │  │   Analytics    │ │   Analytics    │ │   Analytics    │          │   │
│  │  │ • ICD-10 Stats │ │ • Patient Flow │ │ • Revenue/Dept │          │   │
│  │  │ • Visit Volume │ │ • Wait Times   │ │ • Service Rev  │          │   │
│  │  │ • Readmissions │ │ • Workload     │ │ • Insurance %  │          │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘          │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                       EXPORT ENGINE                                  │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │   │
│  │  │   PDF Report   │ │  Excel/CSV     │ │     JSON       │          │   │
│  │  │ • Legal Format │ │ • Data Tables  │ │ • FHIR Bundle  │          │   │
│  │  │ • Charts       │ │ • Pivot Ready  │ │ • API Ready    │          │   │
│  │  │ • Print Ready  │ │ • Analysis     │ │ • Integration  │          │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Exportable Clinical Records (Scope)

### A. Patient Core Records
| Data Element | Standard | Source Table |
|--------------|----------|--------------|
| Patient demographics (MRN, name, DOB, age, sex) | HL7 FHIR Patient | `patients` |
| Contact details (address, phone, emergency contact) | HL7 FHIR Patient | `patients` |
| Encounter/visit details (visit ID, type, dates) | HL7 FHIR Encounter | `visits` |
| Administrative gender | HL7 Administrative Gender | `patients.gender` |

### B. Clinical Assessment & Diagnosis
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Chief complaints | Free text + ICD-10 | `consultations.chief_complaint` |
| History of present illness | SOAP Format | `consultations.history_of_present_illness` |
| Past medical/surgical/family/social history | Structured | `consultations.*_history` |
| Primary diagnosis | **ICD-10 (Mandatory)** | `consultations.primary_diagnosis` |
| Secondary diagnoses | **ICD-10 (Mandatory)** | `consultations.secondary_diagnoses` |

### C. Vitals & Nursing Records
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Blood pressure (systolic/diastolic) | LOINC 85354-9 | `vitals` |
| Pulse rate | LOINC 8867-4 | `vitals.pulse` |
| Temperature | LOINC 8310-5 | `vitals.temperature` |
| Respiratory rate | LOINC 9279-1 | `vitals.respiratory_rate` |
| Oxygen saturation (SpO₂) | LOINC 2708-6 | `vitals.oxygen_saturation` |
| Weight/Height/BMI | LOINC 29463-7, 8302-2, 39156-5 | `vitals` |
| Nursing notes | FHIR Observation | `nursing_notes` |
| Pain scores | LOINC 72514-3 | `nursing_notes.pain_score` |
| Care plans | FHIR CarePlan | `treatment_plans` |

### D. Orders, Procedures & Interventions
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Clinical procedures | **ICD-10-PCS / CPT** | `procedures` |
| Procedure date/time | ISO 8601 | `procedures.performed_at` |
| Performing clinician | HL7 Practitioner | `procedures.performed_by` |
| Procedure outcome | Custom | `procedures.outcome` |
| Complications | ICD-10 | `procedures.complications` |

### E. Medications & Pharmacy
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Drug name | RxNorm / ATC | `prescriptions.drug_name` |
| Dosage | UCUM | `prescriptions.dosage` |
| Route | SNOMED-CT | `prescriptions.route` |
| Frequency | Free text | `prescriptions.frequency` |
| Duration | ISO 8601 Duration | `prescriptions.duration` |
| Dispensing records | Custom | `dispense_records` |

### F. Laboratory & Investigations
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Lab orders | LOINC | `lab_requests` |
| Test results | LOINC | `lab_results` |
| Reference ranges | Lab-specific | `lab_results.reference_range` |
| Abnormal flags | HL7 Observation | `lab_results.abnormal_flag` |

### G. Radiology & Imaging
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Imaging requests | LOINC | `radiology_requests` |
| Modality (X-ray, CT, MRI, US) | DICOM | `radiology_requests.imaging_type` |
| Body part | SNOMED-CT | `radiology_requests.body_part` |
| Findings/Impression | Free text | `radiology_requests.findings` |
| Radiologist report | Structured | `scan_results` |

### H. Billing & Financial Records
| Data Element | Standard | Source Table |
|--------------|----------|--------------|
| Services billed | CPT/Custom | `billing_items` |
| Amounts (total, paid, balance) | Currency | `billing_orders` |
| Payment method | Custom | `payments` |
| Insurance claims | NHIS codes | `billing_orders` |

### I. Wards & Inpatient Care
| Data Element | Standard | Source Table |
|--------------|----------|--------------|
| Ward assignment | Custom | `admissions.ward_id` |
| Bed assignment | Custom | `admissions.bed_id` |
| Admission date/time | ISO 8601 | `admissions.admission_date` |
| Transfers | HL7 ADT | `bed_transfers` |
| Ward round notes | SOAP | `ward_round_notes` |
| Length of stay | Calculated | Derived |

### J. Discharge & Outcomes
| Data Element | Coding Standard | Source Table |
|--------------|-----------------|--------------|
| Discharge summary | Structured | `admissions.discharge_summary` |
| Final diagnoses | ICD-10 | `admissions.final_diagnosis` |
| Discharge medications | ATC | `discharge_medications` |
| Follow-up instructions | Free text | `admissions.follow_up_instructions` |
| Outcome | HL7 Discharge Disposition | `admissions.outcome` |

---

## 📈 Analytics & Statistics

### Clinical Analytics
| Metric | Calculation | Visualization |
|--------|-------------|---------------|
| Disease prevalence by ICD-10 | Count by ICD-10 chapter/category | Bar chart, Pie chart |
| Visit volumes by department | Count by clinic_id over time | Line chart, Trend |
| Admission vs discharge rates | Daily/weekly/monthly comparison | Dual bar chart |
| Length of stay | AVG(discharge_date - admission_date) | Histogram, Box plot |
| Readmission rates | Patients with >1 admission within 30 days | Percentage, Trend |
| Mortality rates | Deaths / Total admissions | Percentage |

### Operational Analytics
| Metric | Calculation | Visualization |
|--------|-------------|---------------|
| Patient flow (Billing → Nursing → Doctor → Pharmacy) | Stage timestamps | Sankey diagram, Funnel |
| Average wait times by stage | AVG(stage_end - stage_start) | Bar chart |
| Department workload | Encounters per doctor/department | Heat map |
| Bed occupancy rate | Occupied beds / Total beds | Gauge, Trend |
| Theatre utilization | Procedures performed / Capacity | Percentage |

### Financial Analytics
| Metric | Calculation | Visualization |
|--------|-------------|---------------|
| Revenue by department | SUM(amount) grouped by department | Bar chart, Pie chart |
| Revenue by service type | SUM(amount) grouped by service_type | Stacked bar |
| Insurance vs cash ratio | Insurance payments / Cash payments | Pie chart |
| Outstanding balances | SUM(total_amount - amount_paid) | Summary card |
| Collection rate | Amount collected / Amount billed | Percentage |

---

## 📄 Standard EMR Report Structure (PDF)

The PDF export will follow this clinically-recognized order:

```
1.  Cover Page & Report Metadata
    ├── Hospital header (logo, name, address)
    ├── Report title and date range
    ├── Generated by and timestamp
    └── Confidentiality notice

2.  Patient Demographics
    ├── Photo (if available)
    ├── Full name, MRN, DOB, Age, Sex
    ├── Contact information
    ├── Emergency contacts
    └── Insurance/NHIS status

3.  Encounter Summary
    ├── Total encounters in period
    ├── Encounter timeline
    ├── Department/clinic breakdown
    └── Admission history

4.  Diagnoses (ICD-10)
    ├── Active problems
    ├── Primary diagnoses by encounter
    ├── Secondary diagnoses
    └── ICD-10 code listing

5.  Vitals & Nursing Notes
    ├── Vital signs trends (charts)
    ├── Latest vitals table
    ├── Nursing notes timeline
    ├── Pain scores
    └── Care plans

6.  Clinical Notes (Doctor Notes)
    ├── Chief complaints
    ├── History of present illness
    ├── Physical examination
    ├── Assessment and plan
    └── Progress notes

7.  Laboratory Results
    ├── Lab orders summary
    ├── Results by category
    ├── Abnormal values highlighted
    └── Trends over time

8.  Radiology Reports
    ├── Imaging requests
    ├── Findings and impressions
    ├── Radiologist comments
    └── Image references (if DICOM available)

9.  Procedures
    ├── Procedures performed
    ├── Operative notes
    ├── Findings and outcomes
    └── Complications (if any)

10. Medications
    ├── Current medications
    ├── Prescription history
    ├── Dispensing records
    └── Discharge medications

11. Billing Summary
    ├── Services billed
    ├── Payment breakdown
    ├── Insurance coverage
    └── Outstanding balance

12. Discharge Summary (if inpatient)
    ├── Admission details
    ├── Hospital course
    ├── Discharge diagnoses
    ├── Discharge medications
    ├── Follow-up instructions
    └── Outcome

13. Analytics & Charts
    ├── Clinical statistics
    ├── Operational metrics
    ├── Financial summary
    └── Trend visualizations
```

---

## 🎛️ Export Controls & Filters

### Admin Controls
- **Module Selection**: Select/deselect any module for export
- **Date Range**: Custom start and end dates
- **Department Filter**: Filter by specific departments
- **ICD-10 Filter**: Filter by diagnosis code or category
- **Clinician Filter**: Filter by attending doctor
- **Encounter Type**: OPD, Inpatient, Emergency
- **Status Filter**: Active, Completed, Discharged

### Export Options
- **Patient Journey View**: Cross-module linked export
- **Module-Isolated View**: Single module export
- **Aggregate Statistics**: Summary without patient-level data
- **Anonymized Export**: For research purposes

---

## 📁 Export Formats

### PDF
- **Purpose**: Legal/clinical documentation, printing
- **Features**: Headers, footers, page numbers, charts, tables
- **Standard**: A4/Letter, portrait/landscape options
- **Security**: Confidentiality notice, generation timestamp

### Excel/CSV
- **Purpose**: Data analysis, pivot tables, further processing
- **Features**: Multiple worksheets by module, formatted headers
- **Standard**: UTF-8 encoding, proper date formatting
- **Structure**: One row per record, proper column headers

### JSON
- **Purpose**: System integration, API consumption
- **Features**: FHIR-compatible resource structure
- **Standard**: JSON Schema validated
- **Structure**: Nested by patient → encounter → records

---

## 🔐 Security & Compliance

- **Access Control**: Role-based export permissions
- **Audit Trail**: Log all export activities
- **Data Minimization**: Export only selected fields
- **Anonymization**: Option for research exports
- **Confidentiality**: Watermarks and notices on PDF
- **HIPAA/GDPR Considerations**: Data handling compliance

---

## 🛠️ Technical Requirements

### Frontend
- React components for export configuration
- Real-time preview capability
- Progress indicators for large exports
- Download management

### Backend
- Efficient data aggregation queries
- Streaming for large datasets
- PDF generation (html-to-pdf or similar)
- Excel generation (xlsx library)
- JSON serialization with FHIR structure

### Performance
- Pagination for large datasets
- Background processing for heavy exports
- Caching for frequently accessed data
- Memory-efficient streaming

---

## 📌 Success Criteria

1. ✅ Clinics can export complete patient journeys across all modules
2. ✅ Admins can combine records from all modules in one export
3. ✅ Reports are usable for clinical review, audits, and management decisions
4. ✅ ICD-10, LOINC, CPT, ATC coding standards are consistently applied
5. ✅ Exports improve clarity over existing records
6. ✅ PDF reports follow recognized EMR/medical documentation standards
7. ✅ Analytics provide actionable insights with visualizations
8. ✅ System handles large datasets efficiently (1000+ patients)

---

## 📚 References

- HL7 FHIR R4 Specification: https://hl7.org/fhir/
- ICD-10-CM: https://www.cdc.gov/nchs/icd/icd10cm.htm
- LOINC: https://loinc.org/
- SNOMED-CT: https://www.snomed.org/
- CPT: https://www.ama-assn.org/practice-management/cpt
- ATC Classification: https://www.who.int/tools/atc-ddd-toolkit

---

## 📞 Contact

For questions about this specification:
- **Project Lead**: EMR Development Team
- **Technical Contact**: System Administrator
- **Clinical Advisor**: Medical Director, NDC Medical Centre

---

*This document is confidential and intended for authorized personnel involved in the NDC Medical Centre EMR development project.*
