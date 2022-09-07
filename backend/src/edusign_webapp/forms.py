import fitz


def get_pdf_form(pdf):
    doc = fitz.open(stream=pdf)
    nfields = doc.is_form_pdf
    fields = []
    if nfields:
        for page in doc:
            for field in page.widgets:
                fields.append({
                    'name': field.field_name,
                    'label': field.field_label,
                    'value': field.field_value,
                    'type': field.field_type,
                    'choices': field.choice_values,
                })
    return fields


def update_pdf_form(pdf, fields):
    doc = fitz.open(stream=pdf)
    for page in doc:
        for field in page.widgets:
            value = fields[field.field_name]
            field.field_value = value

    newpdf = doc.stream()
    return newpdf
