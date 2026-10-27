"""Independently audit the saved continuous-uniform CLT curve, using only stdlib.

The Irwin--Hall CDF is evaluated from its exact alternating polynomial formula
at high precision, independently of the B-spline/SciPy reference test. Absolute
CDF error is integrated adaptively, including the zero at the origin rather
than allowing positive and negative error lobes to cancel.
"""

from decimal import Decimal, localcontext
import json
import math
from pathlib import Path


def adaptive_simpson(function, left, right, tolerance):
    middle = (left + right) / 2
    f_left, f_middle, f_right = map(function, (left, middle, right))
    whole = (right - left) * (f_left + 4 * f_middle + f_right) / 6

    def refine(a, b, fa, fc, fb, integral, tol, depth):
        c = (a + b) / 2
        fl, fr = function((a + c) / 2), function((c + b) / 2)
        lower = (c - a) * (fa + 4 * fl + fc) / 6
        upper = (b - c) * (fc + 4 * fr + fb) / 6
        error = lower + upper - integral
        if abs(error) <= 15 * tol:
            return lower + upper + error / 15
        assert depth > 0, "Adaptive quadrature did not converge"
        return refine(a, c, fa, fl, fc, lower, tol / 2, depth - 1) + refine(
            c, b, fc, fr, fb, upper, tol / 2, depth - 1
        )

    return refine(left, right, f_left, f_middle, f_right, whole, tolerance, 35)


source = Path(__file__).resolve().parents[1] / "blog/preparations/assets/ot-lab/data.js"
data = json.loads(source.read_text().split("=", 1)[1].strip().removesuffix(";"))["clt"]
assert len(data["n"]) == len(data["uniform"])
constant = (1 + 4 * math.exp(-1.5)) / (10 * math.sqrt(2 * math.pi))
assert abs(constant - data["uniformConstant"]) < 1e-15

with localcontext() as context:
    # The alternating CDF polynomial has severe cancellation for large n.
    context.prec = max(100, max(data["n"]))
    for n, saved in zip(data["n"], data["uniform"]):
        factorial = Decimal(math.factorial(n))
        coefficients = [Decimal((-1) ** k * math.comb(n, k)) / factorial for k in range(n + 1)]
        scale = (Decimal(n) / 12).sqrt()

        def absolute_cdf_error(x):
            # Reflect to the lower tail before evaluating either CDF.
            u = Decimal(n) / 2 - Decimal(x) * scale
            lower_tail = Decimal(0) if u <= 0 else sum(
                (coefficients[k] * (u - k) ** n for k in range(int(u) + 1)), Decimal(0)
            )
            return abs(math.erfc(x / math.sqrt(2)) / 2 - float(lower_tail))

        value = 2 * sum(
            adaptive_simpson(absolute_cdf_error, k / 4, (k + 1) / 4, 1e-13 / 36)
            for k in range(36)
        )
        # Both standardized uniform sums and the Gaussian are 1-sub-Gaussian;
        # their integrated tails beyond 9 are below 4 exp(-81/2)/9 < 2e-18.
        assert abs(value - saved) < 2e-10, (n, saved, value)
        print(f"n={n:3d}: W1={value:.12g}, stored-data error={abs(value - saved):.3g}")

print("Passed: every saved uniform CLT distance independently matches high-precision Irwin--Hall quadrature.")
