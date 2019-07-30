#include <string>

using namespace std;

class CRay;
class CTerra;
class GenXTT {
public:
	GenXTT();
	virtual ~GenXTT();
	bool Generate(char *jsn);
	void UnitTest(string phs, double delta, double z, double tcorr);
	bool T(string phs, double deg, double z);

public:
	CRay *pRay;
	CTerra *pTerra;
	double dT;
	double dTdH;
	double pMin;
	string Phase;
};
