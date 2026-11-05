"""Independent numerical checks for the DNN/CP article (NumPy only).

These deterministic finite checks supplement, and do not replace, its proofs.
They do not fit an NMF, assert a Monte Carlo convergence rate, or infer cone
membership from a numerical factorization failure. No files are generated.
"""

import itertools
import math

import numpy as np
from numpy.testing import assert_allclose


checks = 0


def close(actual, expected, **kwargs):
    global checks
    assert_allclose(actual, expected, **kwargs)
    checks += 1


def check(condition):
    global checks
    assert condition
    checks += 1


def cycle(n):
    adjacency = np.zeros((n, n))
    for i in range(n):
        adjacency[i, (i + 1) % n] = adjacency[(i + 1) % n, i] = 1
    return adjacency


def logsumexp(values):
    maximum = np.max(values)
    return maximum + math.log(np.exp(values - maximum).sum())


def composite_gauss(function, left, right, pieces):
    """Positive-weight deterministic quadrature; no adaptive package needed."""
    nodes, weights = np.polynomial.legendre.leggauss(24)
    edges = np.linspace(left, right, pieces + 1)
    half_width = (right - left) / (2 * pieces)
    locations = (edges[:-1, None] + edges[1:, None]) / 2 + half_width * nodes
    return float(half_width * np.sum(function(locations) * weights))


# The two meanings of nonnegativity are independent.
close(np.linalg.eigvalsh([[1, 2], [2, 1]]), [-1, 3], atol=1e-14)
close(np.linalg.eigvalsh([[1, -1], [-1, 1]]), [0, 2], atol=1e-14)

# A known positive Gram factor need not be the principal spectral square root.
factor = np.array([[1, 0], [1, 1], [0, 1]], dtype=float)
example = factor @ factor.T
close(example, [[1, 1, 0], [1, 2, 1], [0, 1, 1]], atol=0)
values, vectors = np.linalg.eigh(example)
close(values, [0, 1, 3], atol=1e-14)
# Set the mathematically zero eigenvalue to zero before taking square roots;
# otherwise its floating-point error would be amplified to order sqrt(eps).
values[np.abs(values) < 1e-13] = 0
root = (vectors * np.sqrt(values)) @ vectors.T
close(root @ root, example, atol=2e-14)
close(root[0, 2], (math.sqrt(3) - 3) / 6, atol=1e-14)
check(root[0, 2] < 0)

# The explicit two-by-two nonnegative Cholesky factor, including boundaries.
for a, c in [(0, 2), (0.2, 0.7), (1, 1), (3, 0.4)]:
    for fraction in [0, 0.2, 0.8, 1]:
        b = fraction * math.sqrt(a * c)
        if a == 0:
            positive_factor = np.diag([0, math.sqrt(c)])
        else:
            positive_factor = np.array([[math.sqrt(a), 0],
                                        [b / math.sqrt(a),
                                         math.sqrt(max(0, c - b * b / a))]])
        check(np.min(positive_factor) >= 0)
        close(positive_factor @ positive_factor.T, [[a, b], [b, c]],
              atol=2e-14)

# Verify the stated feature calculus by explicit nonnegative factors.
other = np.array([[0.2, 1, 0], [2, 0.5, 1], [1, 0, 0.4]])
other_gram = other @ other.T
concatenation = np.column_stack((math.sqrt(0.7) * factor,
                                math.sqrt(1.3) * other))
close(concatenation @ concatenation.T,
      0.7 * example + 1.3 * other_gram, atol=1e-14)
product_features = np.column_stack([factor[:, i] * other[:, j]
                                   for i in range(factor.shape[1])
                                   for j in range(other.shape[1])])
close(product_features @ product_features.T, example * other_gram, atol=1e-14)
nonnegative_map = np.array([[1, 0, 2], [0.5, 1, 0], [0, 0.2, 1], [1, 1, 1]])
close((nonnegative_map @ factor) @ (nonnegative_map @ factor).T,
      nonnegative_map @ example @ nonnegative_map.T, atol=1e-14)

# Five-cycle spectral threshold and explicit CP factorization up to t=1/2.
adjacency = cycle(5)
golden = (1 + math.sqrt(5)) / 2
close(np.linalg.eigvalsh(adjacency),
      sorted(2 * np.cos(2 * math.pi * np.arange(5) / 5)), atol=2e-14)
for t in [0, 0.2, 0.5, 0.6, 1 / golden, 0.7]:
    matrix = np.eye(5) + t * adjacency
    close(np.linalg.eigvalsh(matrix)[0], 1 - golden * t, atol=2e-14)
    if t <= 0.5:
        edge_features = []
        for i in range(5):
            column = np.zeros(5)
            column[i] = column[(i + 1) % 5] = math.sqrt(t)
            edge_features.append(column)
        edge_factor = np.column_stack(edge_features +
                                      list(math.sqrt(1 - 2 * t) * np.eye(5)))
        close(edge_factor @ edge_factor.T, matrix, atol=1e-14)

bad = np.eye(5) + 0.6 * adjacency
check(np.linalg.eigvalsh(bad)[0] > 0.029)
close(np.trace(bad), 5, atol=0)
close(2 * sum(bad[i, (i + 1) % 5] for i in range(5)), 6, atol=1e-14)

# The Horn witness gives a numerical certificate, not a failed-NMF heuristic.
ones = np.ones((5, 5))
horn = ones - 2 * adjacency
positive_bad = bad + 0.1 * ones
close(np.diag(positive_bad), np.full(5, 1.1), atol=0)
check(np.min(positive_bad) == 0.1)
check(np.linalg.eigvalsh(positive_bad)[0] > 0.029)
close(np.sum(horn * positive_bad), -0.5, atol=1e-14)
close(np.sum(horn * np.eye(5)), 5, atol=0)
close(np.sum(horn * adjacency), -10, atol=0)
close(np.sum(horn * ones), 5, atol=0)

# Deterministic simplex-grid checks illustrate the copositivity proof. They
# do not purport to establish the global inequality by finite sampling.
for prefix in itertools.product(range(9), repeat=4):
    if sum(prefix) > 8:
        continue
    z = np.array((*prefix, 8 - sum(prefix)), dtype=float) / 8
    edge_sum = sum(z[i] * z[(i + 1) % 5] for i in range(5))
    check(edge_sum <= 0.25 + 1e-14)
    close(z @ horn @ z, 1 - 4 * edge_sum, atol=2e-14)
    check(z @ horn @ z >= -1e-14)

# The book's strictly positive periodic kernel and its exact five-point cut.
angles = 2 * math.pi * np.arange(5) / 5
offset = 1 / 20
periodic = offset + np.cos((angles[:, None] - angles[None, :]) / 2) ** 2
signed_features = np.column_stack((np.full(5, math.sqrt(offset + 0.5)),
                                   np.cos(angles) / math.sqrt(2),
                                   np.sin(angles) / math.sqrt(2)))
close(signed_features @ signed_features.T, periodic, atol=1e-14)
close(np.linalg.eigvalsh(periodic), [0, 0, 1.25, 1.25, 2.75], atol=2e-14)
check(np.min(periodic) > 0)
close(np.sum(periodic), 25 * (offset + 0.5), atol=1e-13)
close(np.sum(adjacency * periodic),
      10 * (offset + math.cos(math.pi / 5) ** 2), atol=1e-13)
close(np.sum(horn * periodic), 21 / 4 - 5 * math.sqrt(5) / 2, atol=2e-14)
check(np.sum(horn * periodic) < 0)

# Independent positive Gauss-Hermite quadrature of the Gaussian feature
# products. This integrates a deterministic formula rather than Monte Carlo.
nodes, weights = np.polynomial.hermite.hermgauss(64)
normal_nodes, log_weights = math.sqrt(2) * nodes, np.log(weights / math.sqrt(math.pi))
for scale in [0, 0.03, 0.6, 2.5]:
    for u, v in [(np.array([0.4]), np.array([-0.7])),
                 (np.array([0.2, -0.8]), np.array([0.9, 0.3])),
                 (np.array([0.6, -0.2, 0.5]), np.array([0.6, -0.2, 0.5]))]:
        log_expectation = sum(logsumexp(log_weights + math.sqrt(2 * scale) *
                                       normal_nodes * coordinate)
                              for coordinate in u + v)
        log_expectation -= 2 * scale * (u @ u + v @ v)
        close(math.exp(log_expectation), math.exp(-scale * np.sum((u - v) ** 2)),
              rtol=3e-12, atol=2e-14)

for scale, u, v in [(0.2, 0.3, 0.8), (0.7, -0.6, 0.4), (1.2, 0.5, 0.5)]:
    log_second = logsumexp(log_weights + 2 * math.sqrt(2 * scale) *
                          normal_nodes * (u + v)) - 4 * scale * (u * u + v * v)
    close(math.exp(log_second), math.exp(8 * scale * u * v), rtol=3e-12)

# Check the Lévy-exponent integral that constructs the positive stable law.
# The substitution s=exp(v) and expm1 avoid both the endpoint singularity
# and cancellation near zero. With a in [0.2,0.8], omitted log tails are
# bounded by constants times exp(-40), below the numerical tolerance.
for a in [0.2, 0.5, 0.8]:
    for t in [0.1, 1, 3]:
        integrand = lambda v: -np.expm1(-t * np.exp(v)) * np.exp(-a * v)
        integral = composite_gauss(integrand, -200, 200, 400)
        close(integral, math.gamma(1 - a) * t ** a / a, rtol=3e-12)
        for epsilon in [0.4, 1, 2.5]:
            exponent = a * integral / (epsilon * math.gamma(1 - a))
            close(math.exp(-exponent), math.exp(-t ** a / epsilon),
                  rtol=3e-12, atol=1e-14)

# At a=1/2 the stable mixture has an explicit Lévy density. Substituting
# lambda=1/u² removes its heavy tail and permits stable deterministic
# integration of its Laplace transform, including t=0 normalization.
for epsilon in [0.4, 1, 3]:
    coefficient = 1 / epsilon
    for t in [0, 0.1, 1, 4]:
        def levy_integrand(log_u):
            u = np.exp(log_u)
            return coefficient / math.sqrt(math.pi) * np.exp(
                -coefficient * coefficient * u * u / 4 - t / (u * u) + log_u)
        value = composite_gauss(levy_integrand, -40, 10, 100)
        close(value, math.exp(-math.sqrt(t) / epsilon), rtol=3e-12, atol=2e-14)

# Above p=2, a finite three-point Gram matrix already fails PSD.
v = np.array([1, -2, 1])
points = np.array([-0.5, 0, 0.5])
quartic = np.exp(-np.abs(points[:, None] - points[None, :]) ** 4)
close(v @ quartic @ v, 6 - 8 * math.exp(-1 / 16) + 2 * math.exp(-1), atol=1e-14)
check(v @ quartic @ v < -0.779)
for p in [2.1, 2.5, 3, 4, 8]:
    t = 1e-5 / (2 ** p)
    form = -8 * math.expm1(-t) + 2 * math.expm1(-(2 ** p) * t)
    check(form < 0)
    close(form / t, 2 * (4 - 2 ** p), rtol=1e-4)

print(f"Completely positive matrices: {checks} checks passed (explicit Gram "
      "factors, spectral-root caveat, cone calculus, cycle thresholds, Horn "
      "certificates, periodic kernel, Gaussian quadrature, stable Laplace "
      "integrals, and the p>2 obstruction).")
