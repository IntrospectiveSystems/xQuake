#include "GenXTT.h"
#include "json.hpp"
#include "utility.h"
#include <string>
#include <vector>
#include "Terra.h"
#include "Ray.h"
#include "Spline.h"
using namespace std;
using json = nlohmann::json;

GenXTT::GenXTT() {
}

GenXTT::~GenXTT() {
}

bool GenXTT::Generate(char *str) {
	printf("%s\n", str);
	json jsn = json::parse(str);
	string model = jsn["Model"];
	string branch = jsn["Branch"];
	vector<string> rays = jsn["Ray"];
	vector<double> delta = jsn["Delta"];
	vector<double> depth = jsn["Depth"];

	pTerra = new CTerra();
	pRay = new CRay();
	double deg2rad = 0.01745329251994;
	double rad2deg = 57.29577951308;
	pRay->pTerra = pTerra;
	bool bload = pTerra->Load(model.c_str());
	if (!bload) {
		printf(" ** Cannot load model <%s>\n", model.c_str());
		return false;
	}
	printf("Terra nLayer:%ld dRadius:%.2f\n", pTerra->nLayer, pTerra->dRadius);
	double r = pTerra->dRadius;

	// Unit tests
	UnitTest("Pup", 1, 250, 34.99);
	UnitTest("P", 30, 50, 363.82);
	UnitTest("P", 50, 250, 509.04);
	UnitTest("P", 90, 100, 768.24);

	double dmin = delta[0];
	double dinc = delta[1];
	double dmax = delta[2];
	printf("Delta %.2f %.2f %.2f\n", dmin, dinc, dmax);
	int nd = (int)((dmax - dmin + 0.01) / dinc);
	dinc = (dmax - dmin) / nd;
	printf("%d %.4f %.4f\n", nd, dinc, dmin + nd*dinc);

	double zmin = depth[0];
	double zinc = depth[1];
	double zmax = depth[2];
	printf("Depth %.2f %.2f %.2f\n", zmin, zinc, zmax);
	int nz = (int)((zmax - zmin + 0.01) / zinc);
	zinc = (zmax - zmin) / nz;
	printf("%d %.4f %.4f\n", nz, zinc, zmin + nz*zinc);

	// This file is provided for user to determine if producer
	// was big or little endian system
	string magic = "BANDIT";
	short endian = 1;
	FILE *fhd = fopen("Head.bin", "wb");
	fwrite(&magic, 1, 6, fhd);
	fwrite(&endian, 1, 2, fhd);
	fclose(fhd);

	FILE *ftrv = fopen("Trav.bin", "wb");
	FILE *fray = fopen("Ray.bin", "wb");
	double *xv = new double[nd];
	double *tv = new double[nd];
	double *x = new double[nd];
	double *t = new double[nd];
	unsigned char *kray = new unsigned char[nd];

	double z;
	double tbest;
	unsigned char kbest;
	double d;
	int ix1;
	int ix2;
	int nx;
	int nbad;
	for (int i = 0; i < nd; i++)
		xv[i] = dmin + i*dinc;
	for (int iz = 0; iz < nz; iz++) {
		nbad = 0;
		z = zmin + iz*zinc;
		printf("z = %.2f\n", z);
		ix1 = -1;
		for (int ix = 0; ix < nd; ix++) {
			tbest = -10.0;
			d = xv[ix];
			if (z < 0.1 && d < 0.1) {
				printf("Setting origin\n");
				tv[ix] = 0.0;
				ix1 = 0;
				continue;
			}
			for (int iray = 0; iray < rays.size(); iray++) {
				auto ray = rays[iray];
				if (T(ray, d, z)) {
					if (dT < tbest || tbest < 0.0) {
						tbest = dT;
						kbest = iray;
					}
				}
			}
			if (tbest < 0.0)
				nbad++;
			if (ix1 < 0) {
				if (tbest >= 0.0)
					ix1 = ix;
			}
			else {
				if (tbest > 0.0)
					ix2 = ix;
			}
			tv[ix] = tbest;
			kray[ix] = kbest;
		}

		// Patch holes if needed
		double tvix;
		if (nbad > 0) {
			printf("  Patching %d %d %d\n", nbad, ix1, ix2);
			nx = 0;
			for (int ix = ix1; ix <= ix2; ix++) {
				if (tv[ix] >= 0.0) {
					x[nx] = xv[ix];
					t[nx] = tv[ix];
					nx++;
				}
			}
			CSpline *spl = new CSpline();
			spl->Setup(nx, x, t);
			for (int ix = ix1; ix <= ix2; ix++) {
				if (tv[ix] < 0.0) {
					tvix = tv[ix];
					tv[ix] = spl->Y(xv[ix]);
					kray[ix] = kray[ix - 1];
					printf("    %.2f %d %.2f %.2f %.2f\n", z, ix, xv[ix], tv[ix], tvix);
				}
			}
			delete spl;
		}
		//		if (iz == 0) {
		//			for (int i = 0; i < nd; i++)
		//				printf("%d %.2f\n", i, tv[i]);
		//		}
		fwrite(tv, 1, 8 * nd, ftrv);
		fwrite(kray, 1, nd, fray);
	}


	fclose(ftrv);
	fclose(fray);
	printf("Done\n");

	delete[] xv;
	delete[] tv;
	delete[] kray;
	delete t;
	delete x;

	delete pTerra;
	delete pRay;
	return true;
}

//---------------------------------------------------------UnitTest
// Calculate integrated times to compare against AK135
// tables to ensure that there are no huge problems
// in the accuracy of the traveltime branch calculations.
// This test should probably be extended to be more comprehensive
void GenXTT::UnitTest(string phs, double delta, double z, double tcorr) {
	double t = T(phs, delta, z);
	printf("%s D:%.2f Z:%.2f : %.2f - %.2f = %.2f\n",
		phs.c_str(), delta, z, dT, tcorr, dT - tcorr);
}

//---------------------------------------------------------T
// delta in degrees, z in km
// This routine uses reciprocity to calculate travel
// times when source is above station
bool GenXTT::T(string phs, double deg, double z) {
	//	printf("T %s %.4f %.4f\n", phs, deg, z);
	double deg2rad = 0.01745329251994;
	double rad2deg = 57.29577951308;
	double rterra = pTerra->dRadius;
	double rsrc;
	double rcvr;
	double rtmp;
	double pmin = 0.0;
	dT = -10.0;
	double tphs = -10.0;
	double tdif;
	double delta;
	if (fabs(deg) < 0.01)
		delta = 0.01;
	else
		delta = deg;
	int iphs = pRay->setPhase(phs.c_str());
	rcvr = rterra;
	rsrc = rterra - z;
	if (rsrc > rcvr) {
		rtmp = rsrc;
		rsrc = rcvr;
		rcvr = rtmp;
	}
	pRay->setDepth(rterra - rsrc);
	pRay->Setup();
	tphs = pRay->Travel(deg2rad*delta, rcvr, &pmin);
	if (tphs < 0)
		return false;
	if (dT < 0 || tphs < dT) {
		rcvr = rterra + 1;
		rsrc = rterra - z;
		if (rsrc > rcvr) {
			rtmp = rsrc;
			rsrc = rcvr;
			rcvr = rtmp;
		}
		pRay->setDepth(rterra - rsrc);
		pRay->Setup();
		tdif = pRay->Travel(deg2rad*delta, rcvr);
		if (tdif < 0)
			return false;
		dT = tphs;
		dTdH = tdif - dT;
		pMin = pmin;
		Phase = phs;
		return true;
	}

}