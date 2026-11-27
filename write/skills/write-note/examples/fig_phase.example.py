"""Chern-number phase diagram of the Haldane model (worked example for /write-note).

    python3 fig_phase.example.py            # prints every number the example note quotes
    python3 fig_phase.example.py --figure   # also writes phase.png and phase.pdf (needs matplotlib)

Model: honeycomb lattice, nearest-neighbour hopping t1, complex next-nearest-neighbour hopping
t2 exp(+-i phi), sublattice potential +-M (Haldane, PRL 61, 2015 (1988), doi:10.1103/PhysRevLett.61.2015).
Chern number of the lower band from the lattice field strength (Fukui, Hatsugai and Suzuki,
J. Phys. Soc. Jpn. 74, 1674 (2005), doi:10.1143/JPSJ.74.1674) on an N x N mesh of the Brillouin zone.
Units: t1 = 1, lattice constant (nearest-neighbour distance) = 1.
"""
import sys

import numpy as np

T1, T2 = 1.0, 0.1
A = np.array([[0.0, 1.0], [np.sqrt(3) / 2, -0.5], [-np.sqrt(3) / 2, -0.5]])    # A -> B bonds
B = np.array([A[1] - A[2], A[2] - A[0], A[0] - A[1]])                           # A -> A, anticlockwise
# reciprocal vectors of the Bravais lattice a1 = A0 - A1, a2 = A0 - A2
a1, a2 = A[0] - A[1], A[0] - A[2]
Gm = 2 * np.pi * np.linalg.inv(np.array([a1, a2])).T


def hamiltonian(k, M, phi):
    """2x2 Bloch Hamiltonian on a stack of k-points, shape (..., 2) -> (..., 2, 2)."""
    ka = k @ A.T
    kb = k @ B.T
    dx = T1 * np.cos(ka).sum(-1)
    dy = T1 * np.sin(ka).sum(-1)
    dz = M - 2 * T2 * np.sin(phi) * np.sin(kb).sum(-1)
    d0 = 2 * T2 * np.cos(phi) * np.cos(kb).sum(-1)
    h = np.empty(k.shape[:-1] + (2, 2), complex)
    h[..., 0, 0] = d0 + dz
    h[..., 1, 1] = d0 - dz
    h[..., 0, 1] = dx - 1j * dy
    h[..., 1, 0] = dx + 1j * dy
    return h


def chern(M, phi, n):
    """Chern number of the lower band, Fukui-Hatsugai-Suzuki on an n x n mesh."""
    s = np.arange(n) / n
    k = s[:, None, None] * Gm[0] + s[None, :, None] * Gm[1]
    _, v = np.linalg.eigh(hamiltonian(k, M, phi))
    u = v[..., 0]                                       # lower band, shape (n, n, 2)
    def link(a, b):
        z = np.sum(np.conj(a) * b, axis=-1)
        return z / np.abs(z)
    u1 = np.roll(u, -1, axis=0)
    u2 = np.roll(u, -1, axis=1)
    u12 = np.roll(u1, -1, axis=1)
    f = np.angle(link(u, u1) * link(u1, u12) * link(u12, u2) * link(u2, u))
    return int(np.rint(f.sum() / (2 * np.pi)))


def main():
    phis = np.linspace(-np.pi, np.pi, 41)
    ms = np.linspace(-6, 6, 41)                          # M in units of t2
    step = ms[1] - ms[0]
    grid = {}
    for n in (12, 24):
        grid[n] = np.array([[chern(m * T2, p, n) for m in ms] for p in phis])
    c = grid[24]
    exact = np.array([[(np.sign(np.sin(p)) if abs(m) < 3 * np.sqrt(3) * abs(np.sin(p)) else 0)
                       for m in ms] for p in phis])
    # sign convention of this code relative to sgn(sin phi)
    inside = exact != 0
    sign = int(np.sign(np.sum(c[inside] * exact[inside])))
    wrong = np.argwhere(c != sign * exact)
    near = [abs(abs(ms[j]) - 3 * np.sqrt(3) * abs(np.sin(phis[i]))) <= step for i, j in wrong]
    agree_12_24 = np.mean(grid[12] == grid[24])
    print(f"values of C found: {sorted(set(c.ravel().tolist()))}")
    print(f"C = {sign:+d} x sgn(sin phi) inside |M| < 3 sqrt(3) t2 |sin phi|, 0 outside")
    print(f"grid: {len(phis)} phi x {len(ms)} M points, M step {step:.1f} t2, k-mesh 24 x 24")
    print(f"points differing from the analytic phase diagram: {len(wrong)} of {c.size}, "
          f"all within one M step of the boundary: {all(near)}")
    print(f"maximum of the boundary 3 sqrt(3) |sin phi|: {3 * np.sqrt(3):.3f} t2 at phi = +-pi/2")
    print(f"12 x 12 and 24 x 24 meshes agree at {100 * agree_12_24:.1f} % of the points")
    # gap at the transition, a sanity check: at M = 3 sqrt(3) t2 sin(phi) the gap closes at K
    p = np.pi / 2
    K = (2 * Gm[0] + Gm[1]) / 3
    gaps = []
    for k in (K, -K):
        e = np.linalg.eigvalsh(hamiltonian(k[None, :], 3 * np.sqrt(3) * T2 * np.sin(p), p))[0]
        gaps.append(e[1] - e[0])
    print(f"gap at K and K' for M = 3 sqrt(3) t2, phi = pi/2: {gaps[0]:.2e}, {gaps[1]:.3f} t1")
    if "--figure" in sys.argv:
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(3.4, 2.6))
        ax.pcolormesh(phis / np.pi, ms, c.T, cmap="RdBu", vmin=-1.5, vmax=1.5, shading="nearest")
        x = np.linspace(-1, 1, 400)
        ax.plot(x, 3 * np.sqrt(3) * np.sin(np.pi * x), "k--", lw=1)
        ax.plot(x, -3 * np.sqrt(3) * np.sin(np.pi * x), "k--", lw=1)
        ax.set_xlabel(r"$\phi/\pi$")
        ax.set_ylabel(r"$M/t_2$")
        fig.subplots_adjust(left=0.17, bottom=0.18, right=0.97, top=0.96)
        fig.savefig("phase.pdf")
        fig.savefig("phase.png", dpi=200)


if __name__ == "__main__":
    main()
