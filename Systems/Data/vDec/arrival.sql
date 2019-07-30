set trimspool ON;
set linesize 32000;
set pagesize 40000;
set long 200;
spool arrival.txt
select sta, time, iphase, azimuth, delaz, slow, delslo, ema
from idcx_ref.arrival
where time > 1449187200 AND time < 1449187800
order by time;
spool OFF;
exit;
