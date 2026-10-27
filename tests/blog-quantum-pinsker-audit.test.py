"""Independent numerical checks of the quantum Pinsker proof (NumPy only).

These finite checks supplement, and do not replace, the mathematical proof.
They use genuinely complex, noncommuting states and natural logarithms.
Run with a Python interpreter providing NumPy; no files are generated.
"""

import numpy as np


RNG = np.random.default_rng(20261027)


def density(dimension):
    matrix = (RNG.normal(size=(dimension, dimension))
              + 1j * RNG.normal(size=(dimension, dimension)))
    gram = matrix @ matrix.conj().T
    return 0.85 * gram / np.trace(gram).real + 0.15 * np.eye(dimension) / dimension


def matrix_log(matrix):
    values, vectors = np.linalg.eigh(matrix)
    assert np.min(values) > 0
    return (vectors * np.log(values)) @ vectors.conj().T


def relative_entropy(rho, sigma):
    values = np.linalg.eigvalsh(rho)
    assert np.min(values) >= -1e-12
    positive = values[values > 1e-14]
    return float(np.sum(positive * np.log(positive))
                 - np.trace(rho @ matrix_log(sigma)).real)


def trace_norm(matrix):
    return float(np.sum(np.abs(np.linalg.eigvalsh(matrix))))


def curvature(matrix, delta):
    values, vectors = np.linalg.eigh(matrix)
    transformed = vectors.conj().T @ delta @ vectors
    divided = np.empty((len(values), len(values)))
    for i, left in enumerate(values):
        for j, right in enumerate(values):
            if abs(left - right) < 1e-12:
                divided[i, j] = 2 / (left + right)
            else:
                divided[i, j] = (np.log(left) - np.log(right)) / (left - right)
    lower = 2 / (values[:, None] + values[None, :])
    assert np.min(divided - lower) >= -2e-12
    value = float(np.sum(divided * np.abs(transformed) ** 2))
    derivative = vectors @ (divided * transformed) @ vectors.conj().T
    return value, derivative, values, vectors, transformed, lower


nodes, weights = np.polynomial.legendre.leggauss(64)
nodes, weights = (nodes + 1) / 2, weights / 2
cases = 0
for dimension in range(2, 7):
    for _ in range(8):
        rho, sigma = density(dimension), density(dimension)
        delta = rho - sigma
        discrepancy = trace_norm(delta)
        eigenvalues, eigenvectors = np.linalg.eigh(delta)
        sign = (eigenvectors * np.where(eigenvalues > 0, 1, -1)) @ eigenvectors.conj().T
        np.testing.assert_allclose(sign @ sign, np.eye(dimension), atol=1e-12)
        np.testing.assert_allclose(np.trace(delta @ sign), discrepancy, atol=1e-12)
        assert np.linalg.norm(rho @ sigma - sigma @ rho) > 1e-5

        for time in (0, 0.23, 0.61, 1):
            matrix = sigma + time * delta
            second, derivative, values, vectors, transformed, lower = curvature(matrix, delta)
            observable = vectors.conj().T @ sign @ vectors
            factor = np.sum((values[:, None] + values[None, :])
                            * np.abs(observable) ** 2 / 2)
            np.testing.assert_allclose(factor, 1, atol=2e-12)
            assert discrepancy ** 2 <= np.sum(lower * np.abs(transformed) ** 2) + 2e-12
            assert discrepancy ** 2 <= second + 2e-12
            step = 1e-5
            difference = (matrix_log(matrix + step * delta)
                          - matrix_log(matrix - step * delta)) / (2 * step)
            np.testing.assert_allclose(derivative, difference, rtol=2e-7, atol=2e-8)

        entropy = relative_entropy(rho, sigma)
        integrated = sum(weight * (1 - time) * curvature(sigma + time * delta, delta)[0]
                         for time, weight in zip(nodes, weights))
        np.testing.assert_allclose(integrated, entropy, rtol=2e-10, atol=2e-11)
        assert entropy >= discrepancy ** 2 / 2 - 2e-12
        cases += 1

# Repeated eigenvalues require the derivative 1/lambda, not a singular quotient.
matrix = np.eye(3) / 3
delta = np.array([[0, 1j, 0], [-1j, 0.2, 0], [0, 0, -0.2]]) / 10
np.testing.assert_allclose(curvature(matrix, delta)[1], 3 * delta, atol=1e-12)

# A pure state is approached by the exact regularization used in the proof.
sigma = density(4)
vector = RNG.normal(size=4) + 1j * RNG.normal(size=4)
vector /= np.linalg.norm(vector)
rho = np.outer(vector, vector.conj())
limit = relative_entropy(rho, sigma)
errors = []
for eta in (1e-2, 1e-4, 1e-6, 1e-8):
    regularized = (1 - eta) * rho + eta * sigma
    entropy = relative_entropy(regularized, sigma)
    assert entropy >= trace_norm(regularized - sigma) ** 2 / 2 - 2e-12
    errors.append(abs(entropy - limit))
assert all(right < left for left, right in zip(errors, errors[1:]))
assert errors[-1] < 3e-7

# Singular sigma with compatible rho is reduced to their supporting subspace.
sigma_support = np.diag([0.7, 0.3])
rho_support = np.array([[0.4, 0.12j], [-0.12j, 0.6]])
assert relative_entropy(rho_support, sigma_support) >= trace_norm(rho_support - sigma_support) ** 2 / 2

# The commuting binary family approaches the sharp coefficient 1/2.
for epsilon in (1e-2, 1e-3, 1e-4):
    entropy = ((0.5 + epsilon) * np.log1p(2 * epsilon)
               + (0.5 - epsilon) * np.log1p(-2 * epsilon))
    ratio = entropy / (4 * epsilon ** 2)
    assert 0.5 - 1e-10 <= ratio <= 0.5 + epsilon ** 2

print(f"Quantum Pinsker: {cases} complex noncommuting state pairs, sign tests, "
      "log derivatives, curvature integration, repeated eigenvalues, "
      "singular-state limits and sharp classical constant passed.")
