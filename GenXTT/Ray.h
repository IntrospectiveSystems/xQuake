/*****************************************
 * This file is documented for Doxygen.
 * If you modify this file please update
 * the comments so that Doxygen will still
 * be able to work.
 ****************************************/
#ifndef _RAY_H_
#define _RAY_H_

/**
 * \brief enumeration of possible travel time ray phases
 */
enum {
	RAY_Pup,
	RAY_P,
	RAY_Pdiff,
	RAY_PP,
	RAY_PPP,
	RAY_PKP,
	RAY_PKIKP,
	RAY_PKPab,
	RAY_PKPbc,
	RAY_PKPdf,
	RAY_PcP,
	RAY_Sup,
	RAY_S,
	RAY_Sdiff,
	RAY_SS,
	RAY_SSS
};

class CTerra;
class CGeo;

/**
 * \brief traveltime ray path class
 *
 * The traveltime CRay class is a class that encapsulates
 * calculating travel time ray parameters, and using the ray
 * parameters to calculate expected travel times and distances.
 * The Ray parameters are calculated via inversions over a
 * provided CTerra earth structure model.
 *
 * Note that as written, CRay is NOT thread safe.
 */
class CRay {
public:
	/**
	 * \brief A pointer to the CTerra object containing the earth
	 * structure model.
	 */
	CTerra *pTerra;

	/**
	 * \brief An integer variable containing the index of the phase
	 * (from the phase enumeration) for this ray.
	 */
	int iPhase;

	/**
	 * \brief A double variable containing the radius of the earth
	 * at a specific source depth in kilometers.
	 */
	double dRad;

	/**
	 * \brief A double variable containing the minimum ray parameter
	 * for the phase.
	 */
	double dP1;

	/**
	 * \brief A double variable containing the maximum ray parameter
	 * for the phase.
	 */
	double dP2;

	/**
	 * \brief An integer variable containing the number of points in the
	 * tau function
	 * NOTE Does not appear to be used
	 */
	int nTau;

	/**
	 * \brief A double varible containing the step size for the
	 * tau function
	 * NOTE Does not appear to be used
	 */
	double dPinc;

	/**
	 * \brief A pointer to a dynamic array of equally spaced p values
	 * NOTE Does not appear to be used
	 */
	double *dP;

	/**
	 * \brief A pointer to a dynamic array of values defining the
	 * discrete tau function
	 * NOTE Does not appear to be used
	 */
	double *dTau;

	/**
	 * \brief A pointer to a dynamic array of values defining the
	 * second derivative of the discrete tau function (for spline interpolation)
	 * NOTE Does not appear to be used
	 */
	double *dTau2;

	/**
	 * \brief CRay constructor
	 *
	 * The constructor for the CRay class.
	 */
	CRay();

	/**
	 * \brief CRay destructor
	 *
	 * The destructor for the CRay class.
	 */
	virtual ~CRay();

	/**
	 * \brief Set the phase for ray parameters
	 *
	 * Sets the iPhase for this CRay to the provided phase string
	 * \param phs - A const char* representing the phase string
	 * \return Returns the phase index as an integer if successful, -1 if not
	 */
	int setPhase(const char *phs);

	/**
	 * \brief Set the depth for calculations
	 *
	 * Set source depth prior to travel time or delta calculations
	 * \param z - A double variable representing depth in kilometers
	 */
	void setDepth(double z);

	/**
	 * \brief Initialize CRay class
	 *
	 * Initialize CRay class
	 * NOTE: Method seems pointless
	 * \return Always returns true
	 */
	bool Init();

	/**
	 * \brief Setup CRay class
	 *
	 * Setup CRay class based on the previously defined iPhase (via setPhase)
	 */
	void Setup();

	/**
	 * \brief Calculate basic travel time from distance
	 *
	 * Calculate the basic travel time using the given distance
	 *
	 * NOTE Does not appear to be used
	 *
	 * \param delta - A double variable containing the distance in radians to
	 * use in calculating the travel time
	 * \return Returns the calculated travel time in seconds if successful, -1
	 * otherwise
	 */
	double Travex(double delta);

	/**
	 * \brief Calculate minimum travel time from distance
	 *
	 * Calculate minimum travel time from Tau curve for current branch using
	 * the given distance
	 *
	 * \param delta - A double variable containing the distance in radians to
	 * use in calculating the travel time
	 * \return Returns the calculated travel time in seconds if successful, -1
	 * otherwise
	 */
	double Travel(double delta);

	/**
	 * \brief Calculate minimum travel time from distance and radius
	 *
	 * Calculate minimum travel time from Tau curve for current branch using
	 * the given distance and earth radius
	 *
	 * \param delta - A double variable containing the distance in radians to
	 * use in calculating the travel time
	 * \param rcvr - A double variable containing the earth radius in kilometers
	 * \return Returns the calculated travel time in seconds if successful, -1
	 * otherwise
	 */
	double Travel(double delta, double rcvr);

	/**
	 * \brief Calculate minimum travel time from distance and radius
	 *
	 * Calculate minimum travel time from Tau curve for current branch using
	 * the given distance and earth radius, passing the ray parameter
	 *
	 * \param delta - A double variable containing the distance in radians to
	 * use in calculating the travel time
	 * \param rcvr - A double variable containing the earth radius in kilometers
	 * \param p - A pointer to a double variable to return the ray parameter.
	 * \return Returns the calculated travel time in seconds if successful, -1
	 * otherwise
	 */
	double Travel(double delta, double rcvr, double *p);

	/**
	 * \brief Calculate minimum distance from travel time
	 *
	 * Calculate the minimum distance for current branch using
	 * the given travel time, passing the ray parameter
	 *
	 * NOTE Does not appear to be used
	 *
	 * \param t - A double variable containing the travel time in seconds to use
	 * in calculating the distance
	 * \param p - A pointer to a double variable to return the ray parameter.
	 * \return Returns the calculated distance in radians if successful, -1
	 * otherwise if there is no such arrival
	 */
	double Delta(double t, double *p = 0);

	/**
	 * \brief Calculate travel time as a function of ray parameter.
	 *
	 * Calculate the travel time given the ray parameter and depth
	 *
	 * NOTE Does not appear to be used
	 *
	 * \param p - A double variable containing the ray parameter.
	 * \param rcvr - A double variable containing the earth radius in kilometers
	 * \return Returns the calculated travel time in seconds if successful, -1
	 * otherwise if there is no such arrival
	 */
	double T(double p, double rcvr);

	/**
	 * \brief Calculate distance as a function of ray parameter.
	 *
	 * Calculate the distance given the ray parameter and
	 * depth (expressed as an earth radius)
	 *
	 * NOTE Does not appear to be used
	 *
	 * \param p - A double variable containing the ray parameter.
	 * \param rcvr - A double variable containing the earth radius in kilometers
	 * \return Returns the calculated distance in radians if successful, -1
	 * otherwise if there is no such arrival
	 */
	double D(double p, double rcvr);

	/**
	 * \brief Calculate tau as a function of ray parameter.
	 *
	 * Calculate the tau given the ray parameter and
	 * depth (expressed as an earth radius)
	 *
	 * \param p - A double variable containing the ray parameter.
	 * \param rcvr - A double variable containing the earth radius in kilometers
	 * \return Returns the calculated tau if successful, -1
	 * otherwise
	 */
	double Tau(double p, double rcvr);

	/**
	 * \brief Calculate time, distance, or tau integrals over depth.
	 *
	 * Calculate the time, distance, or tau integrals given the ray parameter and
	 * depth (expressed as an earth radius)
	 *
	 * This is an internal routine
	 *
	 * \param par - An integer parameter indicating what to integrate
	 * \param p - A double variable containing the ray parameter.
	 * \param rcvr - A double variable containing the earth radius in kilometers
	 * \return Returns the calculated tau if successful, -1
	 * otherwise
	 */
	double Param(int par, double p, double rcvr);

	/**
	 * \brief Calculates theta function
	 *
	 * Calculates theta function after Buland and Chapman(1983)
	 * I think....
	 *
	 * \param x - The input, in radians
	 * \return Returns the theta function
	 */
	double Fun(double x);

	/**
	 * \brief Calculate bracket minima
	 *
	 * Calculate the bracket minima from a provided 1-dimensional function
	 *
	 * \param x - A pointer to an array of 6 doubles defining the function
	 */
	void MnBrak(double *x);

	/**
	 * \brief Calculate minimum using brent algorithm
	 *
	 * Calculate the minimum using the brent algorithm
	 *
	 * \param xx - A pointer to an array of 3 doubles defining the function
	 * \param tol - A double value containing the tolerance
	 * \param xmin - A pointer to a double value to hold the minimum function x
	 * \return returns the minimum
	 */
	double Brent(double *xx, double tol, double *xmin);
};
#endif
