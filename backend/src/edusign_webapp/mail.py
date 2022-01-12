from flask import current_app
from flask_babel import get_locale
from flask_mail import Message

from edusign_webapp.run import mailer


def compose_message(
    recipients,
    subject_en,
    subject_sv,
    body_txt_en,
    body_html_en,
    body_txt_sv,
    body_html_sv,
    attachment_name='',
    attachment='',
):
    mail = {
        'en': {
            'subject': subject_en,
            'body_txt': body_txt_en,
            'body_html': body_html_en,
        },
        'sv': {
            'subject': subject_sv,
            'body_txt': body_txt_sv,
            'body_html': body_html_sv,
        },
    }
    first = str(get_locale())
    second = first == 'sv' and 'en' or 'sv'

    subject = f"{mail[first]['subject']} / {mail[second]['subject']}"
    msg = Message(subject, recipients=recipients)
    msg.body = f"{mail[first]['body_txt']} \n\n {mail[second]['body_txt']}"
    msg.html = f"{mail[first]['body_html']} <br/><br/> {mail[second]['body_html']}"

    if attachment and attachment_name:
        msg.attach(attachment_name, 'application/pdf', attachment)

    return msg


def sendmail_sync(
    recipients,
    subject_en,
    subject_sv,
    body_txt_en,
    body_html_en,
    body_txt_sv,
    body_html_sv,
    attachment_name='',
    attachment='',
):
    msg = compose_message(
        recipients,
        subject_en,
        subject_sv,
        body_txt_en,
        body_html_en,
        body_txt_sv,
        body_html_sv,
        attachment_name=attachment_name,
        attachment=attachment,
    )

    current_app.logger.debug(f"Email to be sent:\n\n{msg}\n\n")

    mailer.send(msg)


def sendmail_async(
    recipients,
    subject_en,
    subject_sv,
    body_txt_en,
    body_html_en,
    body_txt_sv,
    body_html_sv,
    attachment_name='',
    attachment='',
):
