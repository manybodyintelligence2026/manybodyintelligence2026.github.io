"""BEFORE demo (Option 2): raw jet-colormap spectral function A(k, w) + squashed Fermi surface dump.

Same exact correlated 2D tight-binding + Fermi-liquid self-energy model as after.py,
plotted naively with jet colormaps, raw pixel indices, and unaligned aspect ratios.
"""
from __future__ import annotations

from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
MM = 1.0 / 25.4


def synthesize_spectral_and_fs():
    """Correlated 2D metal spectral function A(k, w) + 2D Fermi surface (DMFT/ARPES model)."""
    t, tp, mu = 0.52, -0.15, -0.22
    Z = 0.52

    def eps_bare(kx, ky):
        return -2 * t * (np.cos(kx) + np.cos(ky)) - 4 * tp * np.cos(kx) * np.cos(ky) - mu

    def spectral(eps_val, w):
        sig_im = 0.045 + 0.34 * (w ** 2) / (1.0 + (w / 1.05) ** 2)
        sig_re = -(1.0 / Z - 1.0) * w / (1.0 + (w / 0.85) ** 2)
        a_qp = (1.0 / np.pi) * sig_im / ((w - eps_val - sig_re) ** 2 + sig_im ** 2)
        a_inc = 0.18 * np.exp(-0.5 * ((w + 1.38 - 0.22 * eps_val) / 0.34) ** 2)
        return a_qp + a_inc

    n = 90
    s1 = np.linspace(0, 1, n, endpoint=False)
    s2 = np.linspace(1, 2, n, endpoint=False)
    s3 = np.linspace(2, 3, n + 1)
    s = np.concatenate([s1, s2, s3])
    kx = np.concatenate([s1 * np.pi, np.full_like(s2, np.pi), (3 - s3) * np.pi])
    ky = np.concatenate([np.zeros_like(s1), (s2 - 1) * np.pi, (3 - s3) * np.pi])

    w = np.linspace(-2.1, 1.1, 240)
    eb_path = eps_bare(kx, ky)
    A_kw = spectral(eb_path[None, :], w[:, None])

    k2d = np.linspace(-np.pi, np.pi, 180)
    KX, KY = np.meshgrid(k2d, k2d)
    A_fs = spectral(eps_bare(KX, KY), 0.0)

    kf_idx = 200 + int(np.argmin(np.abs(eb_path[200:])))
    edc = A_kw[:, kf_idx]
    return s, w, eb_path, A_kw, k2d, A_fs, kf_idx, kx[kf_idx], ky[kf_idx], edc


def main() -> None:
    _s, _w, _eb, A_kw, _k2d, A_fs, _kf, _kxf, _kyf, _edc = synthesize_spectral_and_fs()
    plt.rcdefaults()
    # Match outer aspect ratio to after.py so the curtain wipe aligns cleanly
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(178 * MM, 82 * MM))
    im1 = ax1.imshow(A_kw, origin="lower", aspect="auto", cmap="jet")
    ax1.set_title("Spectral function A(k, w)")
    ax1.set_xlabel("k index")
    ax1.set_ylabel("w index")
    fig.colorbar(im1, ax=ax1)

    im2 = ax2.imshow(A_fs, origin="lower", aspect="auto", cmap="jet")
    ax2.set_title("Fermi surface")
    ax2.set_xlabel("kx idx")
    ax2.set_ylabel("ky idx")
    fig.colorbar(im2, ax=ax2)
    fig.subplots_adjust(left=0.075, right=0.96, bottom=0.14, top=0.86, wspace=0.25)

    out = HERE / "before.png"
    fig.savefig(out, dpi=300)
    plt.close(fig)
    print(f"Wrote {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
