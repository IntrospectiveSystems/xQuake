set trimspool on;
set linesize 32000;
set pagesize 40000;
set long 200;
spool site.txt
select sta, lat, lon, elev, statype, staname from static.site order by sta;
spool off;
exit;


