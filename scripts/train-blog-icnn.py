"""Reproduce the finite-width ICNN fits used by the blog illustration.

Requires NumPy and PyTorch; run from any working directory. These are numerical
fits, not certified global optima. All hidden/output weights are projected onto
the nonnegative orthant after each Adam step. Unrestricted input skips occur at
every layer. The retained candidate minimizes the sampled maximum error on the
101-by-101 evaluation grid, including a zero-padded previous-width candidate.
"""
from pathlib import Path
import json
import math
import numpy as np
import torch

torch.set_num_threads(1)
torch.use_deterministic_algorithms(True)
torch.set_default_dtype(torch.float64)
WIDTHS = [1, 2, 4, 8, 16, 32, 64]
ROOT = Path(__file__).resolve().parents[1]
TRAIN_STEPS = 2200
SEEDS = [17, 53]


class ICNN(torch.nn.Module):
    def __init__(self, width, depth, seed):
        super().__init__()
        torch.manual_seed(seed)
        self.width, self.depth = width, depth
        angles = 2 * math.pi * torch.arange(width) / width + 0.31
        self.a1 = torch.nn.Parameter(torch.stack((angles.cos(), angles.sin()), 1))
        self.b1 = torch.nn.Parameter(0.6 * (torch.rand(width) - 0.5))
        if depth == 3:
            self.w2 = torch.nn.Parameter(torch.rand(width, width) / width)
            self.a2 = torch.nn.Parameter(0.4 * torch.randn(width, 2))
            self.b2 = torch.nn.Parameter(0.2 * torch.randn(width))
        self.c = torch.nn.Parameter(torch.ones(width) / width)
        self.a = torch.nn.Parameter(torch.zeros(2))
        self.b = torch.nn.Parameter(torch.zeros(()))

    def forward(self, x):
        z = torch.relu(x @ self.a1.T + self.b1)
        if self.depth == 3:
            z = torch.relu(z @ self.w2.T + x @ self.a2.T + self.b2)
        return z @ self.c + x @ self.a + self.b

    def project(self):
        with torch.no_grad():
            self.c.clamp_(min=0)
            if self.depth == 3:
                self.w2.clamp_(min=0)

    def pad(self, old):
        """Embed an earlier model exactly, preserving the feasible candidate."""
        n = old.width
        with torch.no_grad():
            self.a1[:n] = old.a1
            self.b1[:n] = old.b1
            self.c.fill_(0)
            self.c[:n] = old.c
            self.a.copy_(old.a)
            self.b.copy_(old.b)
            if self.depth == 3:
                self.w2[:n, :] = 0
                self.w2[:n, :n] = old.w2
                self.a2[:n] = old.a2
                self.b2[:n] = old.b2


def grid(n):
    a = torch.linspace(-1, 1, n)
    x, y = torch.meshgrid(a, a, indexing="xy")
    return torch.stack((x.flatten(), y.flatten()), 1)


def target(x, depth):
    values = [torch.zeros(len(x)), x[:, 0], x[:, 1]]
    if depth == 3:
        values.append(-x[:, 0] - x[:, 1] - 0.5)
    return torch.stack(values).amax(0)


def fit(depth):
    training, checking = grid(41), grid(101)
    truth, check_truth = target(training, depth), target(checking, depth)
    previous, records = None, []
    for width in WIDTHS:
        best_error, best_state = float("inf"), None
        for seed in SEEDS:
            model = ICNN(width, depth, seed)
            if previous is not None and seed == SEEDS[0]:
                model.pad(previous)
            optimizer = torch.optim.Adam(model.parameters(), lr=0.018)
            for step in range(TRAIN_STEPS + 1):
                if step % 100 == 0:
                    with torch.no_grad():
                        error = float((model(checking) - check_truth).abs().max())
                    if error < best_error:
                        best_error = error
                        best_state = {key: value.detach().clone() for key, value in model.state_dict().items()}
                if step == TRAIN_STEPS:
                    break
                # Begin with MSE, then increasingly emphasize the worst residuals.
                power = 2 if step < 500 else 4 if step < 1100 else 8
                residual = model(training) - truth
                loss = (residual.abs().pow(power).mean() + 1e-30).pow(1 / power)
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                model.project()
                if step in [1100, 1700, 2000]:
                    for group in optimizer.param_groups:
                        group["lr"] *= 0.45
        previous = ICNN(width, depth, 0)
        previous.load_state_dict(best_state)
        record = {"width": width, "depth": depth, "gridError": best_error}
        record.update({key: np.round(value.numpy(), 10).tolist() for key, value in best_state.items()})
        records.append(record)
        print(f"depth {depth}, width {width:2d}: sampled maximum error {best_error:.8f}", flush=True)
    return records


data = {"widths": WIDTHS, "evaluationGrid": 101, "trainingGrid": 41,
        "stepsPerStart": TRAIN_STEPS, "seeds": SEEDS,
        "method": "Projected Adam; residual L2, L4, then L8 objectives; best evaluation-grid maximum error across checkpoints and warm start.",
        "two": fit(2), "three": fit(3)}
output = ROOT / "js" / "blog-icnn-models.js"
output.write_text("/* Generated by scripts/train-blog-icnn.py; actual nonnegative ICNN weights. */\n"
                  "(function(root) {\n\"use strict\";\nconst data = " + json.dumps(data, separators=(",", ":")) +
                  ";\nif (typeof module === \"object\" && module.exports) module.exports = data;\n"
                  "else root.BlogICNNModels = data;\n}(typeof window !== \"undefined\" ? window : globalThis));\n")
print(f"Wrote {output}")
