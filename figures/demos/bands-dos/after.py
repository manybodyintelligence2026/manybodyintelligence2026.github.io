"""AFTER demo (Option 1): Nature Physics-grade Spin-Orbit Fat-Band Inversion + Mini BZ Inset + Mirrored PDOS.

Same exact dataset as before.py, built with `/figure-style` + `/render-and-look`:
- Exact APS double-column canvas (178 x 84 mm) with Computer Modern LaTeX math (mbi.mplstyle).
- Visual hierarchy: 6 background bands recede into pale warm grey so active inverted bands pop immediately.
- Variable linewidth ("fat bands") + diverging Crameri `vik` visibly flips orbital parity (p_z <-> d_{x^2-y^2})
  across the spin-orbit band inversion at Gamma.
- Crisp 1st Brillouin Zone inset showing the Gamma -> X -> M -> Gamma path and inverted region.
- Aligned mirrored orbital PDOS with a dotted guide connecting the van Hove saddle point across panels.
"""
from __future__ import annotations

import os
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.collections import LineCollection
from matplotlib.colors import LinearSegmentedColormap, TwoSlopeNorm

from before import synthesize_inverted_bands_and_dos

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
    vik = load_crameri("vik")
    xs = np.linspace(0.92, 0.08, 256)
    cmap_inv = LinearSegmentedColormap.from_list("vik_inv", vik(xs))
    c_p = tuple(vik(0.84)[:3])
    c_d = tuple(vik(0.14)[:3])

    s, ev, ec, pv, pc, bg, E_grid, dos_d, dos_p = synthesize_inverted_bands_and_dos()

    fig = plt.figure(figsize=(178 * MM, 84 * MM))
    ax1 = fig.add_axes([0.08, 0.14, 0.56, 0.72])
    ax2 = fig.add_axes([0.665, 0.14, 0.295, 0.72], sharey=ax1)
    cax = fig.add_axes([0.36, 0.905, 0.28, 0.025])

    ylim = (-3.85, 3.35)
    gap_lo, gap_hi = float(ev.max()), float(ec.min())
    ax1.axhspan(gap_lo, gap_hi, color="#F0ECE5", lw=0, zorder=0)
    ax2.axhspan(gap_lo, gap_hi, color="#F0ECE5", lw=0, zorder=0)
    ax1.axhline(0.0, color="#6A645C", lw=0.65, ls="--", zorder=1)
    ax2.axhline(0.0, color="#6A645C", lw=0.65, ls="--", zorder=1)
    for xtick in (1.0, 2.0):
        ax1.axvline(xtick, color="#DDD7CE", lw=0.6, zorder=0)

    # Background bands in quiet grey for authentic DFT context without noise
    for b in bg:
        ax1.plot(s, b, color="#CBC5BC", lw=0.85, zorder=2)

    # Active BHZ fat bands: width & diverging Crameri vik show the orbital parity flip
    norm = TwoSlopeNorm(vcenter=0.0, vmin=-1.0, vmax=1.0)
    for band_y, parity in ((ev, pv), (ec, pc)):
        pts = np.column_stack([s, band_y]).reshape(-1, 1, 2)
        segs = np.concatenate([pts[:-1], pts[1:]], axis=1)
        p_mid = 0.5 * (parity[:-1] + parity[1:])
        lws = 1.2 + 1.9 * np.abs(p_mid)
        lc = LineCollection(segs, cmap=cmap_inv, norm=norm, linewidths=lws, capstyle="round", zorder=4)
        lc.set_array(p_mid)
        ax1.add_collection(lc)

    ax1.annotate(
        "Band inversion\n" + r"(at $\Gamma$)",
        xy=(0.08, 0.58), xytext=(0.24, 1.16),
        fontsize=7.0, color="#1E1D1B", ha="left", va="center", linespacing=1.15,
        arrowprops=dict(arrowstyle="->", color="#4A453F", lw=0.7, connectionstyle="arc3,rad=0.18"),
        zorder=6,
    )
    ax1.annotate(
        "", xy=(0.30, gap_hi), xytext=(0.30, gap_lo),
        arrowprops=dict(arrowstyle="<->", color="#4A453F", lw=0.75, shrinkA=1, shrinkB=1),
        zorder=6,
    )
    ax1.text(
        0.35, 0.5 * (gap_lo + gap_hi), r"$\Delta_{\mathrm{SOC}}$",
        fontsize=7.6, color="#2D2926", va="center", ha="left", zorder=7,
        bbox=dict(facecolor="#F0ECE5", edgecolor="none", pad=1.2),
    )

    # Dotted guide linking X van Hove saddle point straight into the PDOS peak
    vhs_e = float(ev[110])
    ax1.plot([1.0, 3.0], [vhs_e, vhs_e], color=c_p, lw=0.6, ls=":", alpha=0.75, zorder=2)
    ax2.axhline(vhs_e, color=c_p, lw=0.6, ls=":", alpha=0.75, zorder=2)

    # Mini 1st Brillouin Zone inset tucked cleanly in lower-left open space (zero band overlap)
    ax_bz = ax1.inset_axes([0.020, 0.025, 0.145, 0.215])
    ax_bz.set_facecolor("#FAF8F4")
    ax_bz.set_xlim(-1.42, 1.42); ax_bz.set_ylim(-1.42, 1.42); ax_bz.set_aspect("equal")
    ax_bz.add_patch(patches.Rectangle((-1, -1), 2, 2, fc="none", ec="#6E6A63", lw=0.65))
    ax_bz.add_patch(patches.Circle((0, 0), 0.34, fc=c_d, alpha=0.18, ec="none"))
    ax_bz.plot([0, 1, 1, 0], [0, 0, 1, 0], color="#1D5E57", lw=1.05)
    ax_bz.scatter([0, 1, 1], [0, 0, 1], s=7, color="#1D5E57", zorder=5)
    ax_bz.text(-0.24, -0.50, r"$\Gamma$", fontsize=5.8, color="#1E1D1B")
    ax_bz.text(1.04, -0.30, r"$\mathrm{X}$", fontsize=5.5, color="#1E1D1B")
    ax_bz.text(1.02, 0.92, r"$\mathrm{M}$", fontsize=5.5, color="#1E1D1B")
    ax_bz.set_xticks([]); ax_bz.set_yticks([])
    for sp in ax_bz.spines.values():
        sp.set_edgecolor("#D6CFC5"); sp.set_linewidth(0.5)

    ax1.set_xlim(0.0, 3.0)
    ax1.set_ylim(*ylim)
    ax1.set_xticks([0.0, 1.0, 2.0, 3.0], [r"$\Gamma$", r"$\mathrm{X}$", r"$\mathrm{M}$", r"$\Gamma$"])
    ax1.set_ylabel(r"Energy $E - E_F\ (\mathrm{eV})$")
    ax1.set_xlabel("High-symmetry path")
    ax1.text(0.0, 1.045, "(a)  Orbital-inverted fat bands", transform=ax1.transAxes, fontsize=8.5, fontweight="bold", va="bottom")

    sm = plt.cm.ScalarMappable(cmap=cmap_inv, norm=norm)
    cb = fig.colorbar(sm, cax=cax, orientation="horizontal")
    cb.set_ticks([-1.0, 0.0, 1.0])
    cb.set_ticklabels([r"$p_z$", "hybrid", r"$d_{x^2-y^2}$"])
    cb.ax.xaxis.set_ticks_position("top")
    cb.ax.tick_params(labelsize=7.2, length=2.2, width=0.5, pad=2)
    cb.outline.set_linewidth(0.5)

    # Panel (b): Mirrored orbital PDOS (-p on left, +d on right)
    ax2.axvline(0.0, color="#1E1D1B", lw=0.65, zorder=3)
    ax2.fill_betweenx(E_grid, -dos_p, 0, color=c_p, alpha=0.35, lw=0, zorder=2)
    ax2.plot(-dos_p, E_grid, color=c_p, lw=1.15, zorder=3)
    ax2.fill_betweenx(E_grid, 0, dos_d, color=c_d, alpha=0.32, lw=0, zorder=2)
    ax2.plot(dos_d, E_grid, color=c_d, lw=1.15, zorder=3)

    dmax = max(float(dos_p.max()), float(dos_d.max())) * 1.18
    ax2.set_xlim(-dmax, dmax)
    ax2.set_xticks([-1.5, 0, 1.5], ["1.5", "0", "1.5"])
    ax2.tick_params(axis="y", labelleft=False)
    ax2.set_xlabel(r"Mirrored PDOS ($\mathrm{states\ /\ eV}$)")
    ax2.text(-dmax * 0.86, 2.55, r"$\mathrm{O}\ p$", color=c_p, fontsize=8.2, fontweight="bold", ha="left")
    ax2.text(dmax * 0.86, 2.55, r"$\mathrm{TM}\ d$", color=c_d, fontsize=8.2, fontweight="bold", ha="right")
    vhs_idx = int(np.argmin(np.abs(E_grid - vhs_e)))
    ax2.annotate(
        "vHs",
        xy=(-dos_p[vhs_idx] * 0.88, vhs_e - 0.12),
        xytext=(-dmax * 0.88, -2.85),
        color=c_p, fontsize=7.0, ha="left", va="center",
        arrowprops=dict(arrowstyle="->", color=c_p, lw=0.65, connectionstyle="arc3,rad=-0.16"),
        zorder=6,
    )
    ax2.text(0.0, 1.045, "(b)  Orbital PDOS", transform=ax2.transAxes, fontsize=8.5, fontweight="bold", va="bottom")

    out_png = HERE / "after.png"
    out_pdf = HERE / "after.pdf"
    fig.savefig(out_png, dpi=300)
    fig.savefig(out_pdf)
    plt.close(fig)
    print(f"Wrote {out_png} ({out_png.stat().st_size:,} bytes) and {out_pdf} ({out_pdf.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
