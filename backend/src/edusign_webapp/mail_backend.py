import asyncio

from flask import current_app
from flask_mailman.backends.smtp import EmailBackend


class ParallelEmailBackend(EmailBackend):
    def send_messages_in_parallel(self, email_messages):
        """
        Send one or more EmailMessage objects in parallel
        """
        if not email_messages:
            return 0

        async def send_email(msg):
            return self._send(msg)

        with self._lock:
            new_conn_created = self.open()
            if not self.connection or new_conn_created is None:
                current_app.logger.error(f"Emails not sent: no SMTP connection")
                # We failed silently on open().
                # Trying to send would be pointless.
                return 0

            loop = asyncio.new_event_loop()
            tasks = []

            for message in email_messages:
                current_app.logger.debug(f"Message to send: {str(message)}")
                task = loop.create_task(send_email(message))
                tasks.append(task)

            result = loop.run_until_complete(asyncio.wait(tasks))
            loop.close()

            current_app.logger.debug(f"Emails sent: {result}")

            if new_conn_created:
                self.close()

        return result
