#ifndef _TERRA_H_
#define _TERRA_H_
#include <vector>

#define MLAYER 200

using namespace std;

// It is significant that the S phase is 1 greater
// than the corresponding P phase.
#define FUN_TEST 1000
#define FUN_P_TIME	0
#define FUN_P_DELTA	2
#define FUN_P_TAU   4
#define FUN_S_TIME	1
#define FUN_S_DELTA 3
#define FUN_S_TAU   5

class CTerra {
public:
	char sPath[64];
	int nBreak;
	int iBreak[20];
	int iInner;
	int iOuter;
	long nLayer;
	double dRadius;
	double dR[MLAYER];
	double dP[MLAYER];
	double dS[MLAYER];
	vector<string> Arr;

public:
	CTerra();
	virtual ~CTerra();
	bool Load(const char *file);
	vector<string> Parse(char *s);
	double P(double r);
	double S(double r);
	double Vel(double r, double *vel);
	double Turn(int i1, int i2, double *vel, double pray);
	double Fun(int mode, double r);
	double MidPnt(int mode, double r1, double r2, int n);
	double MidSqu(int mode, double r1, double r2, int n);
	double MidSql(int mode, double r1, double r2, int n);
	double RaySeg(int mode, double r1, double r2, double p);
	double RombergOpenSource(int mode, double r1, double r2, double p);
	double Romberg(int mode, double r1, double r2, double p);
};
#endif
