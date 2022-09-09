from base64 import b64decode

import fitz


def get_pdf_form(b64_pdf):
    """
    Check that the provided PDF contains a form,
    and if so, inspect it and extract the schema.
    """
    if ',' in b64_pdf:
        b64_pdf = b64_pdf.split(',')[1]

    b64_bytes = b64_pdf.encode('ascii')
    pdf_bytes = b64decode(b64_bytes)
    doc = fitz.open(stream=pdf_bytes, filetype='application/pdf')
    nfields = doc.is_form_pdf
    fields = []
    if nfields:
        for page in doc:
            for field in page.widgets():
                fields.append({
                    'name': field.field_name,
                    'label': field.field_label,
                    'value': field.field_value,
                    'type': field.field_type,
                    'choices': field.choice_values,
                })
    return fields


def update_pdf_form(pdf, fields):
    """
    Fill in the PDF form in the provided PDF
    with the values given in the fields param.
    """
    doc = fitz.open(stream=pdf)
    for page in doc:
        for field in page.widgets:
            value = fields[field.field_name]
            field.field_value = value

    newpdf = doc.stream()
    return newpdf
