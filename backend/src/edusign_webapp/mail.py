from time import time

from flask import current_app
from flask_mail import Message
from rq import Queue, get_current_job


def compose_message(
    lang,
    sender,
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
    first = lang
    second = first == 'sv' and 'en' or 'sv'

    subject = f"{mail[first]['subject']} / {mail[second]['subject']}"
    msg = Message(subject, sender=sender, recipients=recipients)
    msg.body = f"{mail[first]['body_txt']} \n\n {mail[second]['body_txt']}"
    msg.html = f"{mail[first]['body_html']} <br/><br/> {mail[second]['body_html']}"

    if attachment and attachment_name:
        msg.attach(attachment_name, 'application/pdf', attachment)

    return msg


def sendmail_sync(
    lang,
    sender,
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
        lang,
        sender,
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
    from edusign_webapp.run import app

    with app.app_context():
        current_app.logger.debug(f"Email to be sent:\n\n{msg}\n\n")
        current_app.mailer.send(msg)


def error_callback(job, connection, type, value, traceback):
    from edusign_webapp.run import app

    with app.app_context():
        current_app.logger.error(f"Problem with email {job.id}: {value} ({type})\n{traceback}")


def sendmail_async(*args, **kwargs):
    job = current_app.mail_queue.enqueue_call(
        func=sendmail_sync, args=args, kwargs=kwargs, result_ttl=5000, on_failure=error_callback
    )
    current_app.logger.debug(f"Queued message:\n  args: {args}\n  kwargs: {kwargs}")
    return job


class BulkMailer:
    def __init__(self):
        self.jobs = []

    def add(self, *args, **kwargs):
        job_id = str(time())
        self.jobs.append({'f': sendmail_sync, 'args': args, 'kwargs': kwargs, 'job_id': job_id})

    def send(self):
        with current_app.mail_queue.connection.pipeline() as pipe:
            for job in self.jobs:
                current_app.mail_queue.enqueue_call(job['f'], on_failure=error_callback, pipeline=pipe, **job)
            pipe.execute()
