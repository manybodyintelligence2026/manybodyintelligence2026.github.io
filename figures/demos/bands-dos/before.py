"""BEFORE demo (Option 1): typical raw DFT/tight-binding Band Structure + DOS dump.

Same exact 8-band spin-orbit inverted model as after.py, plotted with naive matplotlib
defaults: primary rainbow spaghetti, raw k-point indices, legend covering the band inversion,
heavy grids, and mismatched energy axes.
"""
from __future__ import annotations

from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
MM = 1.0 / 25.4


def synthesize_inverted_bands_and_dos():
    """8-band 2D BHZ spin-orbit inverted model + exact 2D BZ orbital-projected DOS.

    Active 2x2 BHZ block has band inversion around Gamma (p_z <-> d_{x^2-y^2}) opened by SOC,
    embedded among 4 deep valence and 2 remote conduction bands.
    """
    n = 110
    s1 = np.linspace(0, 1, n, endpoint=False)
    s2 = np.linspace(1, 2, n, endpoint=False)
    s3 = np.linspace(2, 3, n + 1)
    s = np.concatenate([s1, s2, s3])
    kx = np.concatenate([s1 * np.pi, np.full_like(s2, np.pi), (3 - s3) * np.pi])
    ky = np.concatenate([np.zeros_like(s1), (s2 - 1) * np.pi, (3 - s3) * np.pi])

    cx, cy = np.cos(kx), np.cos(ky)
    g1 = 0.5 * (cx + cy)
    g2 = cx * cy

    M0, B, A_soc = 0.62, 1.05, 0.44
    eps0 = -0.18 * (1 - g1)
    dz = M0 - B * (2.0 - cx - cy)
    dx, dy = A_soc * np.sin(kx), A_soc * np.sin(ky)
    norm_d = np.sqrt(dz**2 + dx**2 + dy**2)
    e_v_act = eps0 - norm_d
    e_c_act = eps0 + norm_d
    p_v = -dz / norm_d
    p_c = +dz / norm_d

    bg_bands = np.vstack([
        -2.55 + 0.55 * g1 + 0.14 * g2,
        -2.05 + 0.42 * g1 - 0.18 * g2 + 0.08 * np.cos(2 * kx),
        -1.58 + 0.34 * g1 + 0.22 * g2,
        -1.18 + 0.24 * (cx - cy) ** 2 * 0.22 - 0.14 * g1,
        1.82 - 0.36 * g1 + 0.14 * g2,
        2.45 - 0.48 * g1 - 0.12 * g2,
    ])

    E_grid = np.linspace(-3.95, 3.45, 580)
    k1d = np.linspace(-np.pi, np.pi, 52, endpoint=False)
    KX, KY = np.meshgrid(k1d, k1d, indexing="ij")
    CX, CY = np.cos(KX), np.cos(KY)
    G1, G2 = 0.5 * (CX + CY), CX * CY
    EPS0 = -0.18 * (1 - G1)
    DZ = M0 - B * (2.0 - CX - CY)
    ND = np.sqrt(DZ**2 + (A_soc * np.sin(KX))**2 + (A_soc * np.sin(KY))**2)
    PV = -DZ / ND
    PC = +DZ / ND

    all_e = [
        EPS0 - ND, EPS0 + ND,
        -2.55 + 0.55 * G1 + 0.14 * G2,
        -2.05 + 0.42 * G1 - 0.18 * G2 + 0.08 * np.cos(2 * KX),
        -1.58 + 0.34 * G1 + 0.22 * G2,
        -1.18 + 0.24 * (CX - CY) ** 2 * 0.22 - 0.14 * G1,
        1.82 - 0.36 * G1 + 0.14 * G2,
        2.45 - 0.48 * G1 - 0.12 * G2,
    ]
    all_wd = [
        0.5 * (1 + PV), 0.5 * (1 + PC),
        np.full_like(G1, 0.12), np.full_like(G1, 0.18), np.full_like(G1, 0.22), np.full_like(G1, 0.28),
        np.full_like(G1, 0.85), np.full_like(G1, 0.90),
    ]
    sigma = 0.08
    dos_d = np.zeros_like(E_grid)
    dos_p = np.zeros_like(E_grid)
    for eb, wb in zip(all_e, all_wd):
        ef = eb.ravel()[None, :]
        wf = wb.ravel()[None, :]
        g = np.exp(-0.5 * ((E_grid[:, None] - ef) / sigma) ** 2) / (sigma * np.sqrt(2 * np.pi))
        dos_d += np.mean(g * wf, axis=1)
        dos_p += np.mean(g * (1.0 - wf), axis=1)
    return s, e_v_act, e_c_act, p_v, p_c, bg_bands, E_grid, dos_d, dos_p


def main() -> None:
    s, ev, ec, _pv, _pc, bg, E_grid, dos_d, dos_p = synthesize_inverted_bands_and_dos()
    plt.rcdefaults()
    # Match outer aspect ratio to after.py so the curtain wipe aligns cleanly
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(178 * MM, 84 * MM), gridspec_kw={"width_ratios": [1.7, 1.0]})
    idx = np.arange(len(s))
    all_b = np.vstack([bg[:4], ev[None, :], ec[None, :], bg[4:]])
    cols = ["red", "green", "blue", "magenta", "cyan", "orange", "lime", "purple"]
    for i in range(all_b.shape[0]):
        ax1.plot(idx, all_b[i], color=cols[i % len(cols)], lw=1.35, label=f"Band {i+1}")
    ax1.set_title("DFT Band Structure")
    ax1.set_xlabel("k-point index")
    ax1.set_ylabel("E")
    ax1.set_ylim(-4.1, 3.6)
    ax1.legend(loc="center", ncol=2, fontsize=6.8)
    ax1.grid(True)

    ax2.plot(dos_d + dos_p, E_grid, "k-", lw=1.3, label="total")
    ax2.plot(dos_d, E_grid, "r--", lw=1.2, label="d orbital")
    ax2.plot(dos_p, E_grid, "g-.", lw=1.2, label="p orbital")
    ax2.set_title("DOS")
    ax2.set_xlabel("DOS")
    ax2.set_ylabel("Energy")
    ax2.set_ylim(-2.9, 3.0)
    ax2.legend(loc="upper right", fontsize=6.8)
    ax2.grid(True)
    fig.subplots_adjust(left=0.08, right=0.96, bottom=0.14, top=0.86, wspace=0.28)

    out = HERE / "before.png"
    fig.savefig(out, dpi=300)
    plt.close(fig)
    print(f"Wrote {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
