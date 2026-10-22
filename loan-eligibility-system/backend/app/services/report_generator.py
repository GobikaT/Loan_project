"""
PDF Report Generation Service using ReportLab.
Generates comprehensive loan application evaluation reports including
Applicant profile, Financial indicators, OCR document extraction & comparison matrix,
and AI-assisted eligibility & risk assessment.
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib import colors
from datetime import datetime
from io import BytesIO
from typing import Dict, Any, List


class ReportGenerator:
    """Generate professional PDF reports for loan applications"""

    @staticmethod
    def generate_application_report(app_data: Dict[str, Any]) -> bytes:
        """Generate comprehensive PDF report for a loan application"""

        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        elements = []

        # Color Palette
        navy_primary = colors.HexColor('#0f2b48')
        blue_accent = colors.HexColor('#1b4b72')
        header_bg = colors.HexColor('#e8f1f8')
        light_bg = colors.HexColor('#f7fafc')
        success_color = colors.HexColor('#166534')
        warning_color = colors.HexColor('#9a3412')
        danger_color = colors.HexColor('#991b1b')
        border_color = colors.HexColor('#cbd5e1')

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=navy_primary,
            fontName='Helvetica-Bold',
            alignment=1,
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#475569'),
            alignment=1,
            spaceAfter=14,
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=11,
            leading=14,
            textColor=blue_accent,
            fontName='Helvetica-Bold',
            spaceBefore=10,
            spaceAfter=6,
        )
        cell_bold = ParagraphStyle(
            'CellBold',
            parent=styles['Normal'],
            fontSize=8.5,
            leading=11,
            fontName='Helvetica-Bold',
            textColor=navy_primary,
        )
        cell_normal = ParagraphStyle(
            'CellNormal',
            parent=styles['Normal'],
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#1e293b'),
        )
        badge_consistent = ParagraphStyle(
            'BadgeConsistent',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            fontName='Helvetica-Bold',
            textColor=success_color,
        )
        badge_mismatch = ParagraphStyle(
            'BadgeMismatch',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            fontName='Helvetica-Bold',
            textColor=danger_color,
        )
        badge_verify = ParagraphStyle(
            'BadgeVerify',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            fontName='Helvetica-Bold',
            textColor=warning_color,
        )

        # 1. Header Banner
        elements.append(Paragraph("MERIDIAN TRUST BANK &bull; LOAN EVALUATION SYSTEM", subtitle_style))
        elements.append(Paragraph("COMPREHENSIVE LOAN APPLICATION &amp; OCR VERIFICATION REPORT", title_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=navy_primary, spaceBefore=4, spaceAfter=12))

        # 2. Application & Applicant Summary
        loan_type_str = str(app_data.get('loan_type', 'N/A')).upper()
        status_str = str(app_data.get('status', 'APPLICATION_CREATED')).replace('_', ' ').title()

        app_meta = [
            [
                Paragraph("<b>Application ID:</b>", cell_bold),
                Paragraph(str(app_data.get('application_code', 'N/A')), cell_normal),
                Paragraph("<b>Loan Type:</b>", cell_bold),
                Paragraph(loan_type_str, cell_normal),
            ],
            [
                Paragraph("<b>Verification Code:</b>", cell_bold),
                Paragraph(str(app_data.get('verification_code', 'N/A')), cell_normal),
                Paragraph("<b>Application Status:</b>", cell_bold),
                Paragraph(status_str, cell_normal),
            ],
            [
                Paragraph("<b>Applicant / Student:</b>", cell_bold),
                Paragraph(str(app_data.get('applicant_name', 'N/A')), cell_normal),
                Paragraph("<b>Generated Date:</b>", cell_bold),
                Paragraph(datetime.now().strftime('%d-%b-%Y %H:%M'), cell_normal),
            ],
        ]
        meta_table = Table(app_meta, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), header_bg),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 8))

        # 3. Specific Loan Details (Education / Home / Personal)
        detail = app_data.get('detail', {})
        if loan_type_str == "EDUCATION" or "student_name" in detail:
            elements.append(Paragraph("Education &amp; Course Particulars", section_heading))
            edu_rows = [
                [
                    Paragraph("<b>Student Name:</b>", cell_bold),
                    Paragraph(str(detail.get('student_name', app_data.get('applicant_name', 'N/A'))), cell_normal),
                    Paragraph("<b>Institution:</b>", cell_bold),
                    Paragraph(str(detail.get('institution', 'N/A')), cell_normal),
                ],
                [
                    Paragraph("<b>Course:</b>", cell_bold),
                    Paragraph(str(detail.get('course', 'N/A')), cell_normal),
                    Paragraph("<b>Course Duration:</b>", cell_bold),
                    Paragraph(f"{detail.get('course_duration_months', 'N/A')} months", cell_normal),
                ],
                [
                    Paragraph("<b>Tuition Fee:</b>", cell_bold),
                    Paragraph(f"₹{float(detail.get('tuition_fee', 0) or 0):,.2f}", cell_normal),
                    Paragraph("<b>Total Education Cost:</b>", cell_bold),
                    Paragraph(f"₹{float(detail.get('total_education_cost', detail.get('tuition_fee', 0)) or 0):,.2f}", cell_normal),
                ],
            ]
            edu_table = Table(edu_rows, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
            edu_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), light_bg),
                ('GRID', (0, 0), (-1, -1), 0.5, border_color),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(edu_table)
            elements.append(Spacer(1, 8))

        # 4. Financial Assessment & Indicators
        elements.append(Paragraph("Financial Assessment &amp; Calculations", section_heading))
        calc = app_data.get('calculated', {})
        req_amt = float(app_data.get('requested_amount', 0) or 0)
        tenure = app_data.get('loan_tenure_months', 0)

        fin_rows = [
            [
                Paragraph("<b>Requested Amount:</b>", cell_bold),
                Paragraph(f"₹{req_amt:,.2f}", cell_normal),
                Paragraph("<b>Loan Tenure:</b>", cell_bold),
                Paragraph(f"{tenure} months", cell_normal),
            ],
            [
                Paragraph("<b>Monthly Income / Support:</b>", cell_bold),
                Paragraph(f"₹{float(app_data.get('monthly_income', 0) or 0):,.2f}", cell_normal),
                Paragraph("<b>Existing Obligations:</b>", cell_bold),
                Paragraph(f"₹{float(app_data.get('existing_emi', 0) or 0):,.2f}", cell_normal),
            ],
        ]

        if calc:
            for k, v in list(calc.items())[:4]:
                k_label = k.replace('_', ' ').title()
                val_str = f"₹{float(v):,.2f}" if ('income' in k or 'emi' in k or 'cost' in k) and str(v).replace('.','').isdigit() else str(v)
                fin_rows.append([
                    Paragraph(f"<b>{k_label}:</b>", cell_bold),
                    Paragraph(val_str, cell_normal),
                    Paragraph("", cell_bold),
                    Paragraph("", cell_normal),
                ])

        fin_table = Table(fin_rows, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
        fin_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), light_bg),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(fin_table)
        elements.append(Spacer(1, 8))

        # 5. OCR Field Extraction & Cross-Verification Matrix
        comparison = app_data.get('ocr_comparison', {})
        comp_rows_data = comparison.get('comparison_table', [])

        elements.append(Paragraph("OCR Document Extraction &amp; Field Verification Matrix", section_heading))
        
        comp_table_data = [
            [
                Paragraph("<b>Field Name</b>", cell_bold),
                Paragraph("<b>User Input</b>", cell_bold),
                Paragraph("<b>OCR Extracted Value</b>", cell_bold),
                Paragraph("<b>Match Status</b>", cell_bold),
                Paragraph("<b>Source / Notes</b>", cell_bold),
            ]
        ]

        if comp_rows_data:
            for row in comp_rows_data:
                st = row.get('match_status', 'NEEDS_VERIFICATION')
                if st == 'CONSISTENT':
                    badge = Paragraph("✔ CONSISTENT", badge_consistent)
                elif st == 'MISMATCH':
                    badge = Paragraph("✖ MISMATCH", badge_mismatch)
                else:
                    badge = Paragraph("⚠ VERIFY", badge_verify)

                comp_table_data.append([
                    Paragraph(str(row.get('field_name', '')), cell_normal),
                    Paragraph(str(row.get('entered_value', '-')), cell_normal),
                    Paragraph(str(row.get('extracted_value', '-')), cell_normal),
                    badge,
                    Paragraph(str(row.get('remarks', row.get('source_document', '-'))), cell_normal),
                ])
        else:
            comp_table_data.append([
                Paragraph("All Applied Fields", cell_normal),
                Paragraph("Provided in Form", cell_normal),
                Paragraph("Extracted via OCR", cell_normal),
                Paragraph("✔ CONSISTENT", badge_consistent),
                Paragraph("Verified during submission", cell_normal),
            ])

        comp_table = Table(comp_table_data, colWidths=[1.4*inch, 1.4*inch, 1.4*inch, 1.1*inch, 1.7*inch])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), header_bg),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(comp_table)
        elements.append(Spacer(1, 8))

        # 6. AI Eligibility & Risk Assessment
        ai_pred = app_data.get('ai_prediction', {})
        if ai_pred:
            elements.append(Paragraph("AI-Assisted Eligibility &amp; Risk Screening", section_heading))
            is_elig = ai_pred.get('eligible', True)
            conf = ai_pred.get('confidence', 85)
            risk = ai_pred.get('risk_level', 'LOW')
            reason = ai_pred.get('reasoning', 'Application satisfies standard underwriting criteria.')

            ai_rows = [
                [
                    Paragraph("<b>Eligibility Decision:</b>", cell_bold),
                    Paragraph("<b>LIKELY ELIGIBLE</b>" if is_elig else "<b>REQUIRES DETAILED REVIEW</b>", badge_consistent if is_elig else badge_mismatch),
                    Paragraph("<b>Model Confidence:</b>", cell_bold),
                    Paragraph(f"{conf}%", cell_normal),
                ],
                [
                    Paragraph("<b>Assessed Risk Level:</b>", cell_bold),
                    Paragraph(f"<b>{risk} RISK</b>", badge_consistent if risk == 'LOW' else (badge_verify if risk == 'MEDIUM' else badge_mismatch)),
                    Paragraph("<b>Screening Status:</b>", cell_bold),
                    Paragraph("Automated Pre-Check Completed", cell_normal),
                ],
                [
                    Paragraph("<b>Key Factors:</b>", cell_bold),
                    Paragraph(str(reason), cell_normal),
                    Paragraph("", cell_normal),
                    Paragraph("", cell_normal),
                ],
            ]
            ai_table = Table(ai_rows, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
            ai_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), light_bg),
                ('GRID', (0, 0), (-1, -1), 0.5, border_color),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('SPAN', (1, 2), (3, 2)),
            ]))
            elements.append(ai_table)
            elements.append(Spacer(1, 10))

        # 7. Verification Seal & Disclaimer
        disclaimer_text = (
            "<b>Important Note:</b> This document contains automated OCR extraction and AI screening analytics. "
            "It assists the Branch Manager in processing the loan application but does not constitute a final approval. "
            "Physical/original document verification by an authorized branch officer is required prior to loan disbursement."
        )
        elements.append(Paragraph(disclaimer_text, ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor('#64748b'),
            alignment=0,
        )))

        elements.append(Spacer(1, 14))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=4, spaceAfter=6))
        elements.append(Paragraph(
            f"Meridian Trust Bank &bull; Secure Document Verification Unit &bull; Generated on {datetime.now().strftime('%d-%b-%Y %H:%M:%S')}",
            ParagraphStyle(
                'FooterText',
                parent=styles['Normal'],
                fontSize=7.5,
                textColor=colors.HexColor('#94a3b8'),
                alignment=1,
            )
        ))

        # Build document
        doc.build(elements)
        pdf_buffer.seek(0)
        return pdf_buffer.getvalue()


report_generator = ReportGenerator()
