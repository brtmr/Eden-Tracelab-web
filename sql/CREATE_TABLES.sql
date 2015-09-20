﻿DROP TABLE THREAD_EVENTS; 
DROP TABLE PROCESS_EVENTS;
DROP TABLE MACHINE_EVENTS;
DROP TABLE THREADS;
DROP TABLE PROCESSES;
DROP TABLE MACHINES;
DROP TABLE TRACES;

CREATE Table IF NOT EXISTS TRACES (
	TRACE_ID SERIAL PRIMARY KEY,
	FILENAME TEXT,
	CREATION_DATE TIMESTAMP
);

CREATE TABLE IF NOT EXISTS MACHINES (
	MACHINE_ID SERIAL PRIMARY KEY,
	NUM INTEGER,
	TRACE_ID INTEGER REFERENCES TRACES (TRACE_ID)
);

CREATE TABLE IF NOT EXISTS PROCESSES (
	PROCESS_ID SERIAL PRIMARY KEY,
	NUM INTEGER,
	MACHINE_ID INTEGER REFERENCES MACHINES (MACHINE_ID)
);

CREATE TABLE IF NOT EXISTS THREADS (
	THREAD_ID SERIAL PRIMARY KEY,
	NUM INTEGER,
	PROCESS_ID INTEGER REFERENCES PROCESSES (PROCESS_ID)
);

--CREATE TYPE RUNSTATE as ENUM ('idle','runnable','running','blocked');

CREATE TABLE IF NOT EXISTS MACHINE_EVENTS (
	MACHINE_ID INTEGER REFERENCES MACHINES (MACHINE_ID),
	STARTTIME BIGINT,
	DURATION BIGINT,
	STATE SMALLINT,
	PRIMARY KEY(MACHINE_ID,STARTTIME)
);

CREATE TABLE IF NOT EXISTS PROCESS_EVENTS (
	PROCESS_ID INTEGER REFERENCES PROCESSES (PROCESS_ID),
	STARTTIME BIGINT,
	DURATION BIGINT,
	STATE SMALLINT,
	PRIMARY KEY(PROCESS_ID,STARTTIME)
);

CREATE TABLE IF NOT EXISTS THREAD_EVENTS (
	THREAD_ID INTEGER REFERENCES THREADS (THREAD_ID),
	STARTTIME BIGINT,
	DURATION BIGINT,
	STATE SMALLINT,
	PRIMARY KEY(THREAD_ID,STARTTIME)
)