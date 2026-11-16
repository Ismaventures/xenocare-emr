# UI Capture Guide For PDF Generation

This guide defines how to capture real EMR interface screens for the modules explained in the documentation, so they can be embedded in generated PDFs.

## 1. Goal

Create a consistent screenshot pack of key EMR screens and map each image to a module/workflow section in the user manual.

## 2. Source Route Map

Application routes are defined in [src/renderer/App.tsx](src/renderer/App.tsx).

## 3. Output Folder And Naming

Store screenshots in:

- docs/ui-captures

Use this naming pattern:

- 01-registration-dashboard.png
- 02-encounter-new.png
- 03-queue-main.png
- 04-nursing-vitals.png
- 05-consultation-soap.png
- 06-lab-approval.png
- 07-radiology-report.png
- 08-pharmacy-dispense.png
- 09-billing-queue.png
- 10-nhis-dashboard.png
- 11-clinical-requests-board.png
- 12-procedures-list.png
- 13-ae-board.png
- 14-anc-dashboard.png
- 15-surgery-schedule.png
- 16-hygiene-worklist.png
- 17-messaging-inbox.png
- 18-analytics-dashboard.png
- 19-medical-reports-form.png
- 20-config-pricing.png

## 4. Capture Standards

- Resolution: 1920x1080 (desktop), optional 1366x768 variant.
- Zoom: 100%.
- Theme: use one consistent theme only.
- Data: use demo/safe data only. No real PHI.
- Crop: include full main content area; avoid OS frame where possible.
- State: capture after data load, no skeleton states.

## 5. UI Capture Checklist By Route

| Image | Route | Screen To Capture | Manual Section |
|---|---|---|---|
| 01-registration-dashboard.png | /registration | Patient list + New Patient button | 5.1 |
| 02-encounter-new.png | /encounter | New encounter creation view | 5.2 |
| 03-queue-main.png | /queue | Department queue board | 5.3 |
| 04-nursing-vitals.png | /nursing | Vitals entry panel | 5.4 |
| 05-consultation-soap.png | /consultation | SOAP and order area | 5.5 |
| 06-lab-approval.png | /lab | Approval queue or results entry | 5.6 |
| 07-radiology-report.png | /radiology | Imaging workflow and report editor | 5.7 |
| 08-pharmacy-dispense.png | /pharmacy | Ready-to-dispense screen | 5.8 |
| 09-billing-queue.png | /billing | Billing queue and payment action | 5.9 |
| 10-nhis-dashboard.png | /nhis | NHIS dashboard or approvals tab | 5.18 |
| 11-clinical-requests-board.png | /clinical-requests | 3-stage request board | 5.19 |
| 12-procedures-list.png | /procedures | Procedure list/scheduling view | 5.20 |
| 13-ae-board.png | /ae | Emergency board/new arrival | 5.21 |
| 14-anc-dashboard.png | /anc | ANC dashboard/enrollment | 5.22 |
| 15-surgery-schedule.png | /surgery | Surgery schedule or checklist view | 5.23 |
| 16-hygiene-worklist.png | /hygiene | Hygiene worklist/infection view | 5.24 |
| 17-messaging-inbox.png | /messaging | Inbox/thread view | 5.25 |
| 18-analytics-dashboard.png | /analytics | KPI/report dashboard | 5.15 |
| 19-medical-reports-form.png | /medical-reports | Medical report generation form | 5.16 |
| 20-config-pricing.png | /configurations | Price management/NHIS pricing area | 5.14, 5.18 |

## 6. Fast Capture Procedure

1. Start renderer and main app.
2. Log in with a demo/admin account.
3. Navigate route by route using the checklist.
4. Save each screenshot with the exact filename.
5. Place all images in docs/ui-captures.

## 7. Embed In User Manual (Optional)

For each relevant section in the user manual, add an image line below the heading:

![Registration UI](docs/ui-captures/01-registration-dashboard.png)

Repeat for each module section.

## 8. Claude Prompt Template For PDF Build

Use this prompt with your PDF generation flow:

- Input markdown: USER_MANUAL.md
- Resolve local image paths from docs/ui-captures
- Render markdown to PDF with embedded images at section positions
- Keep image width to page content width and preserve aspect ratio
- Add page breaks before major sections (5, 6, 10)

## 9. Optional Next Step (Automation)

If needed, we can add an automated screenshot script that opens each route and captures images to docs/ui-captures using a browser automation tool.

## 10. Manifest For Claude/PDF Pipelines

Use the section-to-image manifest at:

- docs/ui-captures/manifest.json

This file is intended for automation and deterministic mapping during PDF generation.

## 11. Extended Placeholder Filenames In USER_MANUAL

In addition to the 01-20 set, the manual also references these placeholders:

- 21-in-patient-management.png
- 22-specialty-clinics-overview.png
- 23-inventory-management.png
- 24-staff-management.png
- 25-customer-service.png
- 26-shared-modules-overview.png
- 31-cash-workflow.png
- 32-nhis-workflow.png
- 33-clinical-requests-workflow.png
- 34-ae-workflow.png
- 35-surgery-workflow.png
- 36-specialty-workflow.png
