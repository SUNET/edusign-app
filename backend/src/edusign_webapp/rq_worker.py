from rq import Connection, Queue, Worker

from edusign_webapp.run import get_redis_conn

if __name__ == '__main__':

    with Connection(get_redis_conn()):
        worker = Worker(Queue())
        worker.work()
