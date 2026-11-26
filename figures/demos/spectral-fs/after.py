"""AFTER demo (Option 2): Nature Physics-grade Spectral Function A(k, w) + k_F EDC + Equal-Aspect Fermi Surface.

Same exact correlated 2D metal dataset as before.py, built with `/figure-style` + `/render-and-look`:
- Exact APS double-column canvas (178 x 82 mm) with Computer Modern LaTeX math (mbi.mplstyle).
- Perceptually uniform Crameri `lipari` replaces garish `jet` heatmaps across A(k, w) and Fermi surface.
- Bare DFT dispersion overlaid cleanly (--) showing quasiparticle bandwidth renormalization Z ~ 0.5 and
  incoherent lower Hubbard weight.
- Aligned k_F Energy Distribution Curve (EDC) sharing the energy axis with A(k, w).
- Exact equal-aspect 2D Fermi surface with 1st BZ symmetry path and linked k_F marker.
"""
from __future__ import annotations

import os
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap

from before import synthesize_spectral_and_fs

HERE = Path(__file__).resolve().parent
STYLE = HERE.parents[1] / "skills" / "figure-style" / "mbi.mplstyle"
SCM_ROOT = Path(os.environ.get("SUPERSOLIDPHONONS_SCM_ROOT", r"D:\[Colormaps]"))
MM = 1.0 / 25.4


def load_crameri(name: str) -> LinearSegmentedColormap:
    f = SCM_ROOT / name / f"{name}.txt"
    if f.exists():
        arr = np.loadtxt(f)
        return LinearSegmentedColormap.from_list(name, arr, N=len(arr))
    return plt.get_cmap("cividis")


def main() -> None:
    plt.style.use(STYLE)
    lipari = load_crameri("lipari")

    s, w, eb_path, A_kw, k2d, A_fs, kf_idx, kxf, kyf, edc = synthesize_spectral_and_fs()

    fig = plt.figure(figsize=(178 * MM, 82 * MM))
    ax1 = fig.add_axes([0.075, 0.14, 0.39, 0.72])
    ax2 = fig.add_axes([0.48, 0.14, 0.125, 0.72], sharey=ax1)
    ax3 = fig.add_axes([0.675, 0.14, 0.25, 0.72])
    cax = fig.add_axes([0.938, 0.19, 0.015, 0.62])

    vmax = float(np.percentile(A_kw, 99.2))
    im = ax1.pcolormesh(s, w, A_kw, cmap=lipari, vmin=0, vmax=vmax, shading="auto", rasterized=True)
    ax1.plot(s, eb_path, color="#FFFFFF", lw=0.95, ls="--", alpha=0.84, zorder=3)
    ax1.axhline(0.0, color="#FFFFFF", lw=0.75, ls=":", alpha=0.9, zorder=4)
    for xt in (1.0, 2.0):
        ax1.axvline(xt, color="#FFFFFF", lw=0.55, alpha=0.35, zorder=3)
    ax1.axvline(s[kf_idx], color="#F6D7B0", lw=0.9, ls="-.", alpha=0.9, zorder=4)
    ax1.text(s[kf_idx] + 0.06, 0.86, r"$k_F$", color="#FFF6E8", fontsize=7.6, va="top")
    ax1.text(0.14, -1.72, "Incoherent\nHubbard weight", color="#F6DFC6", fontsize=6.6, ha="left")
    ax1.annotate(
        "Bare DFT", xy=(0.55, eb_path[50]), xytext=(0.95, -1.25),
        color="#FFFFFF", fontsize=6.8,
        arrowprops=dict(arrowstyle="->", color="#FFFFFF", lw=0.75, connectionstyle="arc3,rad=-0.15"),
    )

    ax1.set_xlim(0, 3); ax1.set_ylim(w[0], w[-1])
    ax1.set_xticks([0, 1, 2, 3], [r"$\Gamma$", r"$\mathrm{X}$", r"$\mathrm{M}$", r"$\Gamma$"])
    ax1.set_ylabel(r"Energy $\omega\ (\mathrm{eV})$")
    ax1.set_xlabel("High-symmetry path")
    ax1.text(0.0, 1.045, r"(a)  Spectral function $A(\mathbf{k},\omega)$", transform=ax1.transAxes, fontsize=8.3, fontweight="bold", va="bottom")

    cb = fig.colorbar(im, cax=cax, orientation="vertical")
    cb.set_ticks([0, vmax])
    cb.set_ticklabels(["0", "high"])
    cb.set_label(r"$A(\mathbf{k},\omega)$", fontsize=7.4, labelpad=2)
    cb.ax.tick_params(labelsize=6.8, length=2.0, width=0.5, pad=2)
    cb.outline.set_linewidth(0.5)

    # Panel (b): Aligned EDC at k_F
    c_qp = tuple(lipari(0.25)[:3])
    c_fill = tuple(lipari(0.68)[:3])
    ax2.axhline(0.0, color="#6A645C", lw=0.65, ls=":")
    ax2.fill_betweenx(w, 0, edc, color=c_fill, alpha=0.45, lw=0)
    ax2.plot(edc, w, color=c_qp, lw=1.2)
    ax2.set_xlim(0, float(edc.max()) * 1.18)
    ax2.set_xticks([0, int(edc.max())])
    ax2.tick_params(axis="y", labelleft=False)
    ax2.set_xlabel("EDC")
    ax2.text(float(edc.max()) * 0.42, 0.34, "QP\npeak", fontsize=6.8, color=c_qp, ha="left")
    ax2.text(0.0, 1.045, r"(b)  $k_F$ cut", transform=ax2.transAxes, fontsize=8.3, fontweight="bold", va="bottom")

    # Panel (c): Equal-aspect 2D Fermi surface
    ax3.pcolormesh(k2d / np.pi, k2d / np.pi, A_fs, cmap=lipari, vmin=0, vmax=float(np.percentile(A_fs, 99.0)), shading="auto", rasterized=True)
    ax3.set_aspect("equal")
    ax3.plot([0, 1, 1, 0], [0, 0, 1, 0], color="#FFFFFF", lw=1.0, alpha=0.9)
    ax3.scatter([kxf / np.pi], [kyf / np.pi], s=26, fc="#F6D7B0", ec="#1E1D1B", lw=0.7, zorder=6)
    ax3.text(0.06, -0.18, r"$\Gamma$", color="#FFFFFF", fontsize=7.5)
    ax3.text(0.84, -0.18, r"$\mathrm{X}$", color="#FFFFFF", fontsize=7.5)
    ax3.text(0.76, 0.82, r"$\mathrm{M}$", color="#FFFFFF", fontsize=7.5)
    ax3.text(kxf / np.pi - 0.34, kyf / np.pi + 0.12, r"$k_F$", color="#FFF6E8", fontsize=7.5)
    ax3.set_xlim(-1, 1); ax3.set_ylim(-1, 1)
    ax3.set_xticks([-1, 0, 1], [r"$-\pi$", "0", r"$\pi$"])
    ax3.set_yticks([-1, 0, 1], [r"$-\pi$", "0", r"$\pi$"])
    ax3.set_xlabel(r"$k_x\ (a^{-1})$")
    ax3.set_ylabel(r"$k_y\ (a^{-1})$", labelpad=1)
    ax3.text(0.0, 1.045, r"(c)  Fermi surface ($\omega=0$)", transform=ax3.transAxes, fontsize=8.3, fontweight="bold", va="bottom")

    out_png = HERE / "after.png"
    out_pdf = HERE / "after.pdf"
    fig.savefig(out_png, dpi=300)
    fig.savefig(out_pdf)
    plt.close(fig)
    print(f"Wrote {out_png} ({out_png.stat().st_size:,} bytes) and {out_pdf} ({out_pdf.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
