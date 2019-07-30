#include <math.h>
#include "Spline.h"

//---------------------------------------------------------CSpline
CSpline::CSpline() {
	dX = 0;
	dY = 0;
	dY2 = 0;
}

//---------------------------------------------------------~CSpline
CSpline::~CSpline() {
	if (dX)
		delete[] dX;
	if (dY)
		delete[] dY;
	if (dY2)
		delete[] dY2;
}
//---------------------------------------------------------CSpline
void CSpline::Setup(int n, double *x, double *y) {
	double p;
	double sig;
	double *u;
	int i;
	int k;

	u = new double[n];
	nX = n;
	dX = new double[n];
	dY = new double[n];
	dY2 = new double[n];
	for (i = 0; i < n; i++) {
		dX[i] = x[i];
		dY[i] = y[i];
	}

	u[0] = 0.0;
	dY2[0] = 0.0;
	for (i = 1; i < n - 1; i++) {
		sig = (x[i] - x[i - 1]) / (x[i + 1] - x[i - 1]);
		p = sig * dY2[i - 1] + 2.0;
		dY2[i] = (sig - 1.0) / p;
		u[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i])
				- (y[i] - y[i - 1]) / (x[i] - x[i - 1]);
		u[i] = (6.0 * u[i] / (x[i + 1] - x[i - 1]) - sig * u[i - 1]) / p;
	}
	dY2[n - 1] = 0.0;
	for (k = n - 2; k >= 0; k--)
		dY2[k] = dY2[k] * dY2[k + 1] + u[k];
	delete[] u;
}

//---------------------------------------------------------CSpline
double CSpline::Y(double x) {
	int klo;
	int khi;
	int k;
	double h;
	double b;
	double a;
	double y;

	klo = 1;
	khi = nX;
	while (khi - klo > 1) {
		k = (khi + klo) >> 1;
		if (dX[k - 1] > x)
			khi = k;
		else
			klo = k;
	}
	h = dX[khi - 1] - dX[klo - 1];
	if (h < 1.0 - 30)
		return 0.0;
	a = (dX[khi - 1] - x) / h;
	b = (x - dX[klo - 1]) / h;
	y = a * dY[klo - 1] + b * dY[khi - 1]
			+ ((a * a * a - a) * dY2[klo - 1] + (b * b * b - b) * dY2[khi - 1])
					* h * h / 6.0;
	return y;
}

//---------------------------------------------------------Test
void CSpline::Test() {
	double x[100];
	double y[100];
	CSpline spline;
	double xx;
	double yy;
	double rr;

	for (int i = 0; i < 11; i++) {
		x[i] = 0.1 * i;
		y[i] = sin(x[i] * 6.28318530);
	}
	spline.Setup(11, x, y);
	for (int i = 0; i < 101; i++) {
		xx = 0.01 * i;
		yy = spline.Y(xx);
		rr = sin(xx * 6.28318530);
	}
}
