// Copyright (c) <1999> Caryl Erin Johnson, MIT license applies (see License.txt)
#include <windows.h>
#include <tchar.h>
#include <stdarg.h>
#include <wtypes.h>
#include <stdio.h>
#include "Utility.h"

int iDebugFlag = 0;
char sDebugFile[64] = "debug.txt";

//---------------------------------------------------------------------Seconds
// Calculate seconds using high performace timer
static LONGLONG llBase = 0;
static LONGLONG llNow;
static double tFactor;
double Secs() {
	LARGE_INTEGER liTemp;
	double sex;	// Twice the fun

	if(llBase == 0) {
		QueryPerformanceFrequency(&liTemp);
		tFactor = 1.0 / liTemp.QuadPart;
		QueryPerformanceCounter(&liTemp);
		llBase = liTemp.QuadPart;
	}
	QueryPerformanceCounter(&liTemp);
	llNow = liTemp.QuadPart;
	sex = tFactor * (llNow - llBase);
	return sex;
}

//---------------------------------------------------------------------------------------TRACE
// This function simply implements the MFC TRACE funtionality for a WIN32
// application. The arguments in the call are exactly the same as for
// printf(), except that the output appears in the debug output stream which
// is usually captured and displayed by Visual C++ if the executable is run
// in debug mode.
int __cdecl TRACE(const TCHAR *szFormat, ...) {
	TCHAR szBuffer[1024];
	va_list pArgList;
	va_start(pArgList, szFormat);
	_vsntprintf(szBuffer, sizeof(szBuffer)/sizeof(TCHAR), szFormat, pArgList);
	va_end(pArgList);
	OutputDebugString(szBuffer);
	return 0;
}

//---------------------------------------------------------------------------------------DebugOn
// Turnon output to debug file
void __cdecl DebugOn() {
	iDebugFlag = 1;
}

//---------------------------------------------------------------------------------------DebugOff
// Turnon output to debug file
void __cdecl DebugOff() {
	iDebugFlag = 0;
}

//---------------------------------------------------------------------------------------DebugFile
// Redirect debug file
void __cdecl SetDebugFile(char *file) {
	strcpy(sDebugFile, file);
}

//---------------------------------------------------------------------------------------Debug
// Same as trace, but also appends text to the file "debug.txt"
int __cdecl Debug(const TCHAR *szFormat, ...) {
	FILE *f;
	TCHAR szBuffer[1024];
	va_list pArgList;
	if(!iDebugFlag)
		return 0;
	va_start(pArgList, szFormat);
	_vsntprintf(szBuffer, sizeof(szBuffer)/sizeof(TCHAR), szFormat, pArgList);
	va_end(pArgList);
	OutputDebugString(szBuffer);
	f = fopen(sDebugFile, "at");
	fprintf(f, "%d:%s", iDebugFlag, szBuffer);
//	fwrite(szBuffer, 1, strlen(szBuffer), f);
	fclose(f);
	return 0;
}


//---------------------------------------------------------------------------------------Debug
// Same as Debug, but also appends text to the file "traffic.txt"
int __cdecl Track(char *file, TCHAR *szFormat, ...) {
	FILE *f;
	TCHAR szBuffer[1024];
	va_list pArgList;
	if(!strcmp(szFormat, "**Clear**")) {
		f = fopen(file, "wt");
		fclose(f);
		return 0;
	}
	va_start(pArgList, szFormat);
	_vsntprintf(szBuffer, sizeof(szBuffer)/sizeof(TCHAR), szFormat, pArgList);
	va_end(pArgList);
//	OutputDebugString(szBuffer);
	f = fopen(file, "at");
	fprintf(f, "%s", szBuffer);
	fclose(f);
	return 0;
}

//---------------------------------------------------------------------------------------Debug
// Same as Debug, but also appends text to the file "traffic.txt"
int __cdecl Traffic(const char *szFormat, ...) {
	FILE *f;
	TCHAR szBuffer[4096];
	va_list pArgList;
//	if(!iTraffic)
//		return 0;
	va_start(pArgList, szFormat);
	_vsntprintf(szBuffer, sizeof(szBuffer)/sizeof(TCHAR), szFormat, pArgList);
	va_end(pArgList);
//	OutputDebugString(szBuffer);
	f = fopen("traffic.txt", "at");
//	f = fopen(sTraffic, "at");
	fprintf(f, "%s\n", szBuffer);
	fclose(f);
	return 0;
}
