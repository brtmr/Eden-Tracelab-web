﻿--select all machines in a trace
SELECT NUM, STARTTIME, DURATION, STATE FROM (MACHINE_EVENTS JOIN MACHINES
	ON MACHINE_EVENTS.MACHINE_ID = MACHINES.MACHINE_ID)
	WHERE STARTTIME > 0
	AND   DURATION  > 1 
	AND   STARTTIME < 15000000
	AND   MACHINES.MACHINE_ID in 
	(SELECT MACHINE_ID FROM MACHINES WHERE 
	TRACE_ID = 1);

--select all processes in a trace: 
SELECT * FROM PROCESS_EVENTS
	WHERE STARTTIME > 10000000
	AND   DURATION  > 5000 
	AND   STARTTIME < 15000000
	AND PROCESS_ID IN (
	SELECT PROCESS_ID FROM PROCESSES WHERE
		MACHINE_ID IN 
			(SELECT MACHINE_ID FROM MACHINES WHERE 
			TRACE_ID = 1) 
	);

--select all threads in a trace.
SELECT * FROM THREAD_EVENTS
	WHERE STARTTIME > 10000000
	AND   DURATION  > 5000 
	AND   STARTTIME < 15000000
	AND   THREAD_ID IN
	(SELECT THREAD_ID FROM THREADS WHERE
		THREAD_ID IN
		(SELECT PROCESS_ID FROM PROCESSES WHERE
			MACHINE_ID IN 
				(SELECT MACHINE_ID FROM MACHINES WHERE 
				TRACE_ID = 1)));

--get the structure of a trace.

--SELECT NUM,MACHINE_ID from MACHINES JOIN 

SELECT * from 
	((MACHINES JOIN 
	(SELECT * FROM TRACES WHERE TRACE_ID = 1) T 
	ON MACHINES.TRACE_ID = T.TRACE_ID) M 
	JOIN PROCESSES ON M.MACHINE_ID = PROCESSES.MACHINE_ID) P;

SELECT NUM as MACHINE_NUM FROM MACHINES;

--RETURN THE ENTIRE TRACE STRUCTURE--
SELECT P.MACHINE_NUM, P.PROCESS_NUM, NUM as THREAD_NUM FROM 
	THREADS
	JOIN (SELECT M.MACHINE_NUM, PROCESS_ID, NUM AS PROCESS_NUM from 
		PROCESSES
		JOIN (SELECT MACHINES.MACHINE_ID, MACHINES.NUM as MACHINE_NUM FROM
			(SELECT * FROM TRACES WHERE TRACE_ID = 1) T 
			JOIN MACHINES
			ON T.TRACE_ID = MACHINES.TRACE_ID) M
		ON M.MACHINE_ID = PROCESSES.MACHINE_ID) P
	ON P.PROCESS_ID = THREADS.PROCESS_ID;


	