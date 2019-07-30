#include <math.h>
#include <stdio.h>
#include <string>
#include <vector>
#include "terra.h"

using namespace std;

CTerra::CTerra() {
	nLayer = 0;
	dRadius = 0.0;
}

CTerra::~CTerra() {
}

bool CTerra::Load(const char *file) {
	FILE *f;
	vector<string> arr;
	char buf[4096];
	double dr[MLAYER];
	double dp[MLAYER];
	double ds[MLAYER];
	double p;
	string str;
	int nc;
	int i;
	char *s;

	nLayer = 0;
	nBreak = 0;
	iInner = -1;
	iOuter = -1;
	strcpy(sPath, file);
	f = fopen(file, "rt");
	if (!f)
		return false;
	while (true) {
		s = fgets(buf, 4000, f);
		if (!s)
			break;
		arr = Parse(s);
		if (arr.size() < 1)
			break;
		str = (string) arr[0];
		if (str == "#")
			continue;
		if (arr.size() < 3)
			break;
		str = (string) arr[0];
		dr[nLayer] = atof(str.c_str());
		str = (string) arr[1];
		dp[nLayer] = atof(str.c_str());
		str = (string) arr[2];
		ds[nLayer] = atof(str.c_str());
		nLayer++;
	}
	fclose(f);
	dRadius = dr[nLayer - 1];	// Assume max depth is center of planet

	// Invert so layers with increasing radius.
	for (i = 0; i < nLayer; i++) {
		dR[i] = dRadius - dr[nLayer - i - 1];
		dP[i] = dp[nLayer - i - 1];
		dS[i] = ds[nLayer - i - 1];
		p = dR[i] / dP[i];
	}

	// Mark discontinuities, inner and outer core boundaries
	for (i = 0; i < nLayer - 1; i++) {
		if (dR[i] > dR[i + 1] - 0.001 && dR[i] < dR[i + 1] + 0.001) {
			iBreak[nBreak++] = i;
			if (dS[i] > 0.01 && dS[i + 1] < 0.01) {
				iInner = i;
			}
			if (dS[i] < 0.01 && dS[i + 1] > 0.01) {
				iOuter = i;
			}
		}
	}
	int ibreak;
	double rbreak;
	printf("Give me a break\n");
	for (int i = 0; i < nBreak; i++) {
		ibreak = iBreak[i];
		printf("%4d %10.2f %10.2f\n", ibreak, dR[ibreak], dP[ibreak]);
	}

	return true;
}

//---------------------------------------------------------Parse
vector<string> CTerra::Parse(char *buf) {
	vector<string> arr;
	int state;
	char s[1000];
	char c;
	int n;

	state = 0;
	n = 0;
	for (int i = 0; i < (int) strlen(buf); i++) {
		c = buf[i];
		switch (state) {
		case 0:	// Looking for first non-blank
			if (c == ' ' || c == '\t' || c == ',' || c == '\n' || c == '\r')
				continue;
			s[0] = c;
			n = 1;
			state = 1;
			break;
		case 1:	// Looking for end of string
			if (c == ' ' || c == '\t' || c == ',' || c == '\n' || c == '\r') {
				s[n] = 0;
				arr.push_back(string(s));
				n = 0;
				state = 0;
			} else {
				s[n++] = c;
			}
			break;
		}
	}
	if (n) {
		s[n] = 0;
		arr.push_back(string(s));
	}
	return arr;
}

// Interpolate velocity, currently linear only
double CTerra::P(double r) {
	return Vel(r, dP);
}
double CTerra::S(double r) {
	return Vel(r, dS);
}
double CTerra::Vel(double r, double *vel) {
	double v;

	int jm;
	int jl = -1;
	int ju = nLayer;
	while (ju - jl > 1) {
		jm = (ju + jl) >> 1;
		if (r > dR[jm])
			jl = jm;
		else
			ju = jm;
	}
	if (jl < 0)
		jl = 0;
	if (jl > nLayer - 2)
		jl = nLayer - 2;
	v = vel[jl]
			+ (r - dR[jl]) * (vel[jl + 1] - vel[jl]) / (dR[jl + 1] - dR[jl]);
	return v;
}

// Turn: Calculate bottoming radius for a ray with a given
//    ray parameter between specified model index
//    bounds. (This is an internal helper method for Tau().
//    Assumes p monotonically increasing between jl and jm.
//    Out of range values cause interpolation from closest
//    valid interval.
double CTerra::Turn(int i1, int i2, double *vel, double pray) {
	double r;
	double p;
	double r1, r2;
	double v1, v2;

	int jl = i1;
	int ju = i2;
	int jm;
	while (ju - jl > 1) {
		jm = (ju + jl) >> 1;
		p = dR[jm] / vel[jm];
		if (pray > p)
			jl = jm;
		else
			ju = jm;
	}
	if (jl < 0)
		jl = 0;
	if (jl > nLayer - 2)
		jl = nLayer - 2;
	r1 = dR[jl];
	r2 = dR[jl + 1];
	v1 = vel[jl];
	v2 = vel[jl + 1];
	// Messy formula for r because v not p is linearly interpolated.
	r = pray * (r1 * (v2 - v1) - v1 * (r2 - r1))
			/ (pray * (v2 - v1) - (r2 - r1));
	return r;
}

static int nIt;
static double dStep;
static double dRay;
// Fun: Evaluate function during integration
double CTerra::Fun(int mode, double r) {
	double v;
	double fun = 0.0;
	double p = dRay;

	switch (mode) {
	case FUN_TEST:
		fun = 1.0 / sqrt(r);
//		fun = sin(r);
//		fun = r*r;
		break;
	case FUN_P_TIME:
		v = P(r);
		fun = 1.0 / sqrt(1.0 / v / v - p * p / r / r) / v / v;
		break;
	case FUN_P_DELTA:
		v = P(r);
		fun = p / sqrt(1.0 / v / v - p * p / r / r) / r / r;
		break;
	case FUN_P_TAU:
		v = P(r);
		fun = sqrt(1.0 / v / v - p * p / r / r);
		break;
	case FUN_S_TIME:
		v = S(r);
		fun = 1.0 / sqrt(1.0 / v / v - p * p / r / r) / v / v;
		break;
	case FUN_S_DELTA:
		v = S(r);
		fun = p / sqrt(1.0 / v / v - p * p / r / r) / r / r;
		break;
	case FUN_S_TAU:
		v = S(r);
		fun = sqrt(1.0 / v / v - p * p / r / r);
		break;
	}
	return fun;
}

void PolInt(double *xa, double *ya, int n, double x, double *y, double *dy) {
	int i;
	int m;
	int ns = 1;
	double den, dif, dift, ho, hp, w;
	double c[100], d[100];

	dif = fabs(x - xa[1]);
	for (i = 1; i <= n; i++) {
		if ((dift = fabs(x - xa[i])) < dif) {
			ns = i;
			dif = dift;
		}
		c[i] = ya[i];
		d[i] = ya[i];
	}
	*y = ya[ns--];
	for (m = 1; m < n; m++) {
		for (i = 1; i <= n - m; i++) {
			ho = xa[i] - x;
			hp = xa[i + m] - x;
			w = c[i + 1] - d[i];
			if ((den = ho - hp) == 0.0) {
				*y = 0.0;
				*dy = 0.0;
				return;
			}
			den = w / den;
			d[i] = hp * den;
			c[i] = ho * den;
		}
		*y += (*dy = (2 * ns < (n - m) ? c[ns + 1] : d[ns--]));
	}
}

double CTerra::MidPnt(int mode, double r1, double r2, int n) {
	double x, tnm, sum, del, ddel;
	int j;

	if (n == 1) {
		nIt = 1;
		dStep = (r2 - r1) * Fun(mode, 0.5 * (r1 + r2));
	} else {
		tnm = nIt;
		del = (r2 - r1) / (3.0 * tnm);
		ddel = del + del;
		x = r1 + 0.5 * del;
		sum = 0.0;
		for (j = 0; j < nIt; j++) {
			sum += Fun(mode, x);
			x += ddel;
			sum += Fun(mode, x);
			x += del;
		}
		nIt *= 3;
		dStep = (dStep + (r2 - r1) * sum / tnm) / 3.0;
	}
	return dStep;
}

double CTerra::MidSqu(int mode, double rr1, double rr2, int n) {
	double x, tnm, sum, del, ddel;
	double r1, r2, xx;
	int j;

	r1 = 0.0;
	r2 = sqrt(rr2 - rr1);
	if (n == 1) {
		nIt = 1;
		xx = 0.5 * (r1 + r2);
		dStep = 2.0 * xx * (r2 - r1) * Fun(mode, rr2 - xx * xx);
	} else {
		tnm = nIt;
		del = (r2 - r1) / (3.0 * tnm);
		ddel = del + del;
		x = r1 + 0.5 * del;
		sum = 0.0;
		for (j = 0; j < nIt; j++) {
			sum += 2.0 * x * Fun(mode, rr2 - x * x);
			x += ddel;
			sum += 2.0 * x * Fun(mode, rr2 - x * x);
			x += del;
		}
		nIt *= 3;
		dStep = (dStep + (r2 - r1) * sum / tnm) / 3.0;
	}
	return dStep;
}

double CTerra::MidSql(int mode, double rr1, double rr2, int n) {
	double x, tnm, sum, del, ddel;
	double r1, r2, xx;
	int j;

	r1 = 0.0;
	r2 = sqrt(rr2 - rr1);
	if (n == 1) {
		nIt = 1;
		xx = 0.5 * (r1 + r2);
		dStep = 2.0 * xx * (r2 - r1) * Fun(mode, rr1 + xx * xx);
	} else {
		tnm = nIt;
		del = (r2 - r1) / (3.0 * tnm);
		ddel = del + del;
		x = r1 + 0.5 * del;
		sum = 0.0;
		for (j = 0; j < nIt; j++) {
			sum += 2.0 * x * Fun(mode, rr1 + x * x);
			x += ddel;
			sum += 2.0 * x * Fun(mode, rr1 + x * x);
			x += del;
		}
		nIt *= 3;
		dStep = (dStep + (r2 - r1) * sum / tnm) / 3.0;
	}
	return dStep;
}

// RaySeg: Integrate function (time, delta, tau) over ray segment
//		separated by parameter discontinuities
double CTerra::RaySeg(int mode, double r1, double r2, double p) {
	int i, j;

	double rr1 = r1;
	double rr2 = r2;
	double fun = 0.0;
	for (i = 0; i < nBreak; i++) {
		j = iBreak[i];
		if (dR[j] <= rr1)
			continue;
		if (dR[j] < rr2) {
			fun += Romberg(mode, rr1, dR[j], p);
			rr1 = dR[j + 1];
		}
	}
	if (rr2 > rr1)
		fun += Romberg(mode, rr1, rr2, p);
//	else
//		fun -= Romberg(mode, rr2, rr1, p);
	return fun;
}

#include <math.h>
#define ROMB_MAX 20
double EPS1 = 1.0e-6;
double CTerra::RombergOpenSource(int mode, double r1, double r2, double pray) {
	// MIT license
	int n, m, i;
	double a = r1;
	double b = r2;
	dRay = pray;
	double h, s;
	double c[ROMB_MAX + 1];
	double* tmp;
	int lim;
	double p;
	double t, u;
	double l;
	h = 2;
	c[0] = 0;
	l = 0;
	lim = 1;
	b -= a;
	for (n = 0; n < ROMB_MAX; ++n) {
		p = h / 2 - 1;
		s = 0.0;
		for (i = 0; i < lim; i++) {
			t = 1 - p*p;
			u = p + t*p / 2;
			u = (u*b + b) / 2 + a;
		//	s = s + t*(*f)(u);
			s += t*Fun(mode, u);
			p += h;
		}
		p = 4;
		t = c[0];
		c[0] = (c[0] + h*s) / 2.0;
		for (i = 0; i <= n; i++) {
			u = c[i + 1];
			c[i + 1] = (p*c[i] - t) / (p - 1);
			t = u;
			p *= 4;
		}
		if (fabs(c[i] - l) < EPS1*fabs(c[i]) * 16) break;
		l = c[i];
		lim <<= 1;
		h /= 2.0;
	}
	return c[i] * b * 3 / 4;
}

// Romberg: Romberg integration of function over interval
//			Singularities at end points permitted.
#define EPS 1.0e-6
#define JMAX 14
#define JMAXP JMAX+1
#define K 5
double CTerra::Romberg(int mode, double r1, double r2, double p) {
	int j;
	double ss, dss, h[JMAXP + 1], s[JMAXP + 1];
	double fac = 1.0;

	if (r2 - r1 < 0.000001)
		return 0.0;
	if (mode == FUN_P_DELTA || mode == FUN_S_DELTA)
		fac = 180.0 / 3.1415924;

	dRay = p;
	h[1] = 1.0;
	for (j = 1; j <= JMAX; j++) {
		s[j] = MidSql(mode, r1, r2, j);
		if (j >= K) {
			PolInt(&h[j - K], &s[j - K], K, 0.0, &ss, &dss);
			if (fabs(dss) < EPS * fabs(ss)) {
				return ss;
			}
		}
		s[j + 1] = s[j];
		h[j + 1] = h[j] / 9.0;
	}
	return 0.0;
}

