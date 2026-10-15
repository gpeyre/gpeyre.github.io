"""Check every saved uniform CLT distance against continuous-CDF quadrature.

Requires NumPy and SciPy. No files are generated or changed. In particular,
this does not run the authoring script under blog/ideas.
"""

import json
from pathlib import Path

import numpy as np
from scipy.integrate import quad
from scipy.interpolate import BSpline
from scipy.special import ndtr


source = Path(__file__).resolve().parents[1] / "blog/preparations/assets/ot-lab/data.js"
data = json.loads(source.read_text().split("=", 1)[1].strip().removesuffix(";"))["clt"]

for n, saved in zip(data["n"], data["uniform"]):
    cdf = BSpline.basis_element(np.arange(n + 1), extrapolate=False).antiderivative()

    def error(x):
        # Symmetry gives twice the positive-half-line integral. Evaluate the
        # lower tail to avoid subtraction of two nearly-one CDF values.
        u = n / 2 - x * np.sqrt(n / 12)
        lower_tail = 0.0 if u <= 0 else float(cdf(u))
        return abs(float(ndtr(-x)) - lower_tail)

    # Put abs INSIDE quadrature. Merely detecting strict sign changes misses
    # a zero at a grid node (notably x=0), and can cancel entire error lobes.
    boundaries = np.linspace(0, 9, 37)
    value = 2 * sum(quad(error, a, b, epsabs=2e-13, epsrel=1e-10)[0]
                    for a, b in zip(boundaries[:-1], boundaries[1:]))
    assert abs(value - saved) < 2e-10, (n, saved, value)
    print(f"n={n:3d}: W1={value:.12g}, n W1={n * value:.12g}")

print("Passed: every saved CLT uniform distance uses absolute CDF error without cancellation.")
