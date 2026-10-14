#!/usr/bin/env python3
"""Compute whole-square errors of the stored ICNNs; never retrain their weights.

Requires NumPy and SciPy. Run from any directory to regenerate the small JS file.
For a convex ICNN h and target F=max_i l_i, max(h-F) is attained at a vertex
of a target affine cell. Each min(h-l_i) on that cell is an epigraph linear
program: nonnegative hidden/output weights make the ReLU relaxation exact.
These floating-point computations measure stored networks, not the best possible
error of the architecture, and are not interval-arithmetic certificates.
"""

import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linprog


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "js/blog-icnn-models.js"
DESTINATION = ROOT / "js/blog-icnn-diagnostics.js"
PLANES = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [-1, -1, -.5]])
TOLERANCE = 2e-8


def forward(model, points):
    z = np.maximum(0, points @ np.array(model["a1"]).T + model["b1"])
    if model["depth"] == 3:
        z = np.maximum(0, z @ np.array(model["w2"]).T
                       + points @ np.array(model["a2"]).T + model["b2"])
    return z @ model["c"] + points @ model["a"] + model["b"]


def cell_vertices(region):
    """Clip the square by half planes ax+by <= c (Sutherland–Hodgman)."""
    vertices = np.array([[-1., -1.], [1., -1.], [1., 1.], [-1., 1.]])
    for row in region:
        clipped = []
        for start, end in zip(vertices, np.roll(vertices, -1, axis=0)):
            v0, v1 = start @ row[:2] - row[2], end @ row[:2] - row[2]
            inside0, inside1 = v0 <= 1e-12, v1 <= 1e-12
            if inside0:
                clipped.append(start)
            if inside0 != inside1:
                clipped.append(start + v0 / (v0 - v1) * (end - start))
        vertices = np.array(clipped)
    assert len(vertices) >= 3
    assert np.max(vertices @ region[:, :2].T - region[:, 2]) <= TOLERANCE
    return vertices


def minimum(model, plane, region):
    """Minimize h-plane on a target cell using monotone-network epigraphs."""
    width, depth = model["width"], model["depth"]
    dimension = 2 + width * (depth - 1)
    constraints = np.zeros((width * (depth - 1) + len(region), dimension))
    constraints[:width, :2] = model["a1"]
    constraints[:width, 2:2 + width] = -np.eye(width)
    rhs = list(-np.array(model["b1"]))
    if depth == 3:
        constraints[width:2 * width, :2] = model["a2"]
        constraints[width:2 * width, 2:2 + width] = model["w2"]
        constraints[width:2 * width, 2 + width:] = -np.eye(width)
        rhs.extend(-np.array(model["b2"]))
    constraints[-len(region):, :2] = region[:, :2]
    rhs.extend(region[:, 2])
    rhs = np.array(rhs)
    objective = np.zeros(dimension)
    objective[:2], objective[-width:] = np.array(model["a"]) - plane[:2], model["c"]
    result = linprog(objective, A_ub=constraints, b_ub=rhs,
                     bounds=[(-1, 1)] * 2 + [(0, None)] * (dimension - 2),
                     method="highs", options={"primal_feasibility_tolerance": 1e-9,
                                               "dual_feasibility_tolerance": 1e-9})
    assert result.success, result.message
    value = result.fun + model["b"] - plane[2]
    point = result.x[:2]
    actual = forward(model, point[None, :])[0] - point @ plane[:2] - plane[2]
    assert abs(actual - value) <= TOLERANCE, (actual, value)
    assert np.min(rhs - constraints @ result.x) >= -TOLERANCE
    assert np.min(result.x[2:]) >= -TOLERANCE
    assert np.max(np.abs(point)) <= 1 + TOLERANCE
    return float(actual), point.tolist()


def diagnostics(model, planes):
    assert np.min(model["c"]) >= 0
    if model["depth"] == 3:
        assert np.min(model["w2"]) >= 0
    minima, maxima = [], []
    for plane in planes:
        differences = planes - plane
        region = np.column_stack((differences[:, :2], -differences[:, 2]))
        vertices = cell_vertices(region)
        error = forward(model, vertices) - (vertices @ plane[:2] + plane[2])
        index = int(np.argmax(error))
        maxima.append((float(error[index]), vertices[index].tolist()))
        minima.append(minimum(model, plane, region))
    over, over_point = max(maxima, key=lambda item: item[0])
    low, under_point = min(minima, key=lambda item: item[0])
    result = {"width": model["width"], "maxError": max(over, -low),
              "overError": over, "underError": -low,
              "overPoint": over_point, "underPoint": under_point}
    if model["depth"] == 3:
        result["triangleMin"], result["triangleMinPoint"] = minima[0]
        triangle = np.array([[0, 0], [0, -.5], [-.5, 0]])
        result["triangleVertexValues"] = forward(model, triangle).tolist()
    # Independent grid plus deterministic off-grid checks for missed signs/cells.
    mesh = np.meshgrid(np.linspace(-1, 1, 101), np.linspace(-1, 1, 101))
    samples = np.column_stack([coordinate.ravel() for coordinate in mesh])
    samples = np.vstack((samples, np.random.default_rng(17).uniform(-1, 1, (1000, 2))))
    residual = forward(model, samples) - np.max(samples @ planes[:, :2].T + planes[:, 2], axis=1)
    assert np.max(residual) <= over + TOLERANCE
    assert np.min(residual) >= low - TOLERANCE
    assert np.max(np.abs(residual)) <= result["maxError"] + TOLERANCE
    return result


def rounded(value):
    if isinstance(value, float):
        return round(value, 12) + 0.0
    if isinstance(value, list):
        return [rounded(item) for item in value]
    if isinstance(value, dict):
        return {key: rounded(item) for key, item in value.items()}
    return value


def main():
    source = SOURCE.read_bytes()
    models = json.loads(source.decode().split("const data = ", 1)[1].split(";\nif", 1)[0])
    data = {"widths": models["widths"], "modelSha256": hashlib.sha256(source).hexdigest(),
            "method": "Whole-square extrema: target-cell vertices and ReLU epigraph LPs (SciPy HiGHS). Numerical tolerance checks; not formal certificates or architecture-optimal errors."}
    for name, count in (("two", 3), ("three", 4)):
        data[name] = [diagnostics(model, PLANES[:count]) for model in models[name]]
        for item in data[name]:
            print(f"{name:5s} width={item['width']:2d}: max error={item['maxError']:.12f}")
    payload = json.dumps(rounded(data), separators=(",", ":"), allow_nan=False)
    DESTINATION.write_text("/* Generated by scripts/check-blog-icnn.py; numerical whole-square errors. */\n"
                           "(function(root) {\n\"use strict\";\nconst data = " + payload + ";\n"
                           "if (typeof module === \"object\" && module.exports) module.exports = data;\n"
                           "else root.BlogICNNDiagnostics = data;\n"
                           "}(typeof window !== \"undefined\" ? window : globalThis));\n")


if __name__ == "__main__":
    main()
