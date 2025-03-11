# -*- coding: utf-8 -*-
#
# Copyright (c) 2021 SUNET
# All rights reserved.
#
#   Redistribution and use in source and binary forms, with or
#   without modification, are permitted provided that the following
#   conditions are met:
#
#     1. Redistributions of source code must retain the above copyright
#        notice, this list of conditions and the following disclaimer.
#     2. Redistributions in binary form must reproduce the above
#        copyright notice, this list of conditions and the following
#        disclaimer in the documentation and/or other materials provided
#        with the distribution.
#     3. Neither the name of the SUNET nor the names of its
#        contributors may be used to endorse or promote products derived
#        from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
# FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
# BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
# LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
#
from typing import Any, Dict, List, Union

from flask import Flask, g

from edusign_webapp.document.metadata import sql

import psycopg2
from psycopg2 import pool
from psycopg2 import sql as pg_sql
from psycopg2.extras import RealDictCursor


PRIMARY_KEY_AUTOINCREMENT = "BIGSERIAL PRIMARY KEY"


class PostgresqlMD(sql.SqlMD):
    """
    Postgresql backend to deal with the metadata associated to documents
    to be signed by more than one user.

    This metadata includes data about the document (name, size, type),
    data about its owner (who has uploaded the document and invited other users to sign it),
    and data about the users who have been invited to sign the document.
    """

    def __init__(self, app: Flask):
        """
        :param app: flask app
        """
        super().__init__(app)
        self.user = app.config.get('PG_DB_USER')
        self.password = app.config.get('PG_DB_PASSWORD')
        self.host = app.config.get('PG_DB_HOST')
        self.port = app.config.get('PG_DB_PORT')
        self.database = app.config.get('PG_DB_NAME')

        db_exists, tables_exist = self._database_exists()
        if not tables_exist:
            self._create_database(db_exists)

        self.connection_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            user=self.user,
            password=self.password,
            host=self.host,
            port=self.port,
            database=self.database
        )

        @app.teardown_appcontext
        def _close_db_connection(exc):
            conn = g.pop('db_conn', None)
            if conn is not None:
                self.connection_pool.putconn(conn)

    def _database_exists(self):
        """
        Check if a PostgreSQL database exists.

        Returns:
            bool: True if the database exists, False otherwise
        """
        # Connect to the default 'postgres' database
        conn = None
        db_exists = False
        tables_exist = False
        try:
            # Connect to the postgres database (this DB always exists)
            conn = psycopg2.connect(
                dbname='postgres',
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port
            )
            # Create a cursor and execute the query to check if the database exists
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM pg_database WHERE datname = %s;",
                    (self.database,)
                )
                db_exists = cursor.fetchone() is not None
                cursor.close()

            if db_exists:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
                    )
                    tables = cursor.fetchall()
                    tables_exist = "Documents" in tables
                    cursor.close()

            conn.close()

            return (db_exists, tables_exist)

        except Exception as e:
            self.logger.error(f"Error checking if database exists: {e}")
            return (False, False)

        finally:
            if conn:
                conn.close()

    def _create_database(self, db_exists):
        conn = None
        try:
            conn = psycopg2.connect(
                dbname='postgres',
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port
            )
            conn.autocommit = True

            if not db_exists:
                with conn.cursor() as cursor:
                    # Use sql.Identifier to safely quote the database name
                    cursor.execute(
                        pg_sql.SQL("CREATE DATABASE {}").format(pg_sql.Identifier(self.database))
                    )
                conn.close()

            dbconn = psycopg2.connect(
                dbname=self.database,
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port
            )
            dbconn.autocommit = True

            schema = f"""
                {sql.DB_SCHEMA}
                set my.version to {sql.CURRENT_DB_VERSION};
                alter database {self.database} set my.version from current;
            """
            schema = schema.replace("PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY")

            with dbconn.cursor() as cursor:
                cursor.execute(schema)

            dbconn.close()
            self.logger.info(f"Database '{self.database}' created successfully")

        except Exception as e:
            self.logger.error(f"Error creating database: {e}")

        finally:
            if conn:
                conn.close()

    def _get_db_connection(self):
        if 'db_conn' not in g:
            g.db_conn = self.connection_pool.getconn()
        return g.db_conn

    def _close_db_connection(self):
        conn = g.pop('db_conn', None)
        if conn is not None:
            self.connection_pool.putconn(conn)

    def _db_execute(self, stmt: str, args: tuple = ()):
        conn = self._get_db_connection()
        cursor = conn.cursor()
        cursor.execute(stmt, args)
        cursor.close()

    def _db_query(
        self, query: str, args: tuple = (), one: bool = False
    ) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
        conn = self._get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, args)
        rv = cursor.fetchall()
        cursor.close()
        return (rv[0] if rv else None) if one else rv

    def _db_commit(self):
        conn = self._get_db_connection()
        conn.commit()
