//int CDECL TRACE(TCHAR*szFormat, ...);
#ifndef _UTIL_H_
#define _UTIL_H_
#pragma warning( disable : 4996 )
#pragma warning( disable : 4267 )

extern int iTraffic;
double Secs();
int __cdecl TRACE(const char *szFormat, ...);
void __cdecl DebugOn();
void __cdecl DebugOff();
void __cdecl SetDebugFile(char *file);
int __cdecl Debug(const char *szFormat, ...);
int __cdecl Track(char *file, char *szFormat, ...);
int __cdecl Traffic(const char *szFormat, ...);

#endif
