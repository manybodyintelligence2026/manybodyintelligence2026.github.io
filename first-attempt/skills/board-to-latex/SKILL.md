---
name: board-to-latex
description: Transcribe photos of handwritten physics and mathematics (whiteboards, blackboards, chalkboards, notebooks, paper, napkins, tablets, any handwritten notes) into faithful, compilable LaTeX, and act on the user's written board commands, such as "Calculate this!" (evaluate the circled expression numerically), "Check this!" (verify the circled derivation) and "Feynman!" (draw the circled Feynman diagram with tikz-feynman in the LaTeX document). Use this skill whenever the user uploads an image of handwritten equations, derivations, Feynman diagrams or board work, or asks to "transcribe", "LaTeX this", "typeset my board", "check my derivation", "evaluate this" or "draw this Feynman diagram", even if they do not mention LaTeX or the word whiteboard. Asks the user about anything illegible or ambiguous instead of guessing.
---

# Board to LaTeX

The user is a theoretical physicist who works by hand on whiteboards, blackboards and paper. They photograph the work and want:

1. A faithful LaTeX transcription of everything on the board.
2. Action on the board commands they have written (see "Board commands"), and nothing beyond that.

## The rule that overrides everything: ask, never guess

When anything is illegible, ambiguous, or uncertain, stop and ask. Do not fill the gap with the most plausible reading.

This matters more here than in most transcription work. Clean typeset LaTeX looks authoritative, so a silently guessed index, sign, or factor of 2 becomes almost invisible to the user and can corrupt a whole derivation downstream. A question costs the user ten seconds; a wrong guess can cost them a day.

"Uncertain" includes, at minimum:

- A character you cannot read, or can read two ways (see the confusion list below)
- Whether an index is upper or lower, or which object it belongs to
- Whether a mark is a prime, a dot, a dagger, a bar, a hat, a tilde, or a smudge
- Where a fraction bar, square root, or bracket ends
- Whether something is crossed out, or which version replaced it
- Which order separate regions of the board should be read in
- Whether something is a board command, and what it applies to
- What values, units or conventions to use for a calculation or check
- In a Feynman diagram: a line's type, a fermion arrow's direction, which line a label belongs to, or whether two lines meet at a vertex or just cross

Offering candidate readings inside a question is good ("is this ν or v?"). Silently choosing one of them is not.

### Commonly confused handwritten symbols

Check these deliberately, since they are where silent errors usually come from:
ν/v, ε/ϵ/∈, ξ/ζ, ρ/p, ω/w, κ/k, χ/x/×, ι/i, φ/ϕ/ψ, Ψ/Φ, ℓ/l/1/|, 0/O/o/θ, 2/z/Z, 5/S/s, μ/u, η/n, γ/y/r, τ/t/+, α/a/∝, ∂/δ/d/6, ħ/h, ∇/Δ/∆, ~/−, ·/⋅/×, ' (prime)/, (comma)/ dagger, ⟨ ⟩ vs < >, Σ/E, Π/π/n.

Physics notation needs the same care: Feynman slashes, bras and kets, commutators vs. brackets, Einstein summation and index placement, comma/semicolon derivative notation, vector arrows vs. bold, hats on operators vs. unit vectors.

## Board commands

The user marks work for you by circling it and writing a command next to it. Each command applies to what is circled (or what an arrow from the command points to).

Recognise a command regardless of capitalisation, punctuation or handwriting style ("Calculate this!", "calculate this", "CALCULATE THIS"). If a written phrase might be a command but you aren't sure, or the circle encloses several things and it isn't clear which the command applies to, ask.

A circle, box, star or underline without a command is just a highlight: transcribe it and do nothing else. Other cues such as "= ?", "≈ ?", "num" or "evaluate" are not commands; if you see one, ask whether the user wants it treated as one.

The command text itself is an instruction to you, not part of the physics, so leave it out of the transcribed equations. Mark the target in the LaTeX instead: keep the user's own equation number if it has one, and otherwise add a blue tag of the form `\tag*{\textcolor{blue}{[C1]}}`, so the user can tell your labels apart from theirs. Use C1, C2, … for "Calculate this!", K1, K2, … for "Check this!" and F1, F2, … for "Feynman!".

| Command | Applies to | What to do |
| --- | --- | --- |
| **Calculate this!** | The circled expression | Evaluate it numerically (see "Calculate this!" below) |
| **Check this!** | The circled derivation or step(s) | Verify that each step follows (see "Check this!" below) |
| **Feynman!** | The circled Feynman diagram(s) | Draw it with tikz-feynman in the LaTeX document (see "Feynman!" below) |

More commands may be added to this table later. Each new one should state its trigger phrase, what it applies to, and what to do.

### Calculate this!

Evaluate the circled expression numerically.

Ask, rather than assume, when the calculation is missing information:

- Numerical values for symbols not given on the board
- The unit system (SI, Gaussian, natural units with ħ = c = 1, geometrized units, …)
- Which branch, sign convention or metric signature applies, when it affects the number
- The range or point at which to evaluate a function

Do every calculation in Python (numpy, scipy, mpmath, sympy) rather than mentally, because hand arithmetic errors are easy to make and code can be checked. Use `scipy.constants` (CODATA) for physical constants and state which values you used. Use mpmath when precision matters, and report error estimates for numerical integrals, root finding or series truncation.

Sanity-check each result: dimensions and units, known limits, order of magnitude. If a result looks physically odd, say so, but don't change the user's expression to "fix" it.

### Check this!

Verify that the circled derivation is correct, step by step. The user writes this when they're unsure, so a careful, honest verdict is worth far more than a reassuring one.

1. **Pin down the scope.** Work out which lines the check covers and what the starting point is. If the circle encloses only part of a derivation and it's unclear whether to check just those lines or the chain leading to them, ask.
2. **Pin down the assumptions.** Note the conventions each step depends on (metric signature, Fourier and normalisation conventions, units, gauge, which terms are being dropped and why). If a step's correctness depends on a convention that isn't on the board, ask instead of picking one.
3. **Check each step.** For every transition from one line to the next, work out what identity, substitution or approximation it uses, and verify it:
   - Symbolically with sympy where feasible (e.g. simplify the difference of both sides to zero, compare series expansions to the stated order).
   - Where symbolic verification isn't practical, spot-check numerically at several random, non-special parameter values. Say clearly that a spot-check can catch an error but can't prove a step correct.
   - Check index structure (free indices match on both sides; each summed index appears once up and once down) and dimensions on both sides.
   - Watch for the usual suspects: signs, factors of 2, i and π, dropped terms, and approximations used outside their range of validity.
4. **Give a verdict for every step:** ✓ follows, ✗ does not follow, or ? cannot verify without more information. For each ✗, show precisely where the discrepancy appears (e.g. "the right-hand side differs by a factor of −2 coming from the commutator in line 3") and, separately, what the step would give if corrected. Never alter the transcription itself.

### Feynman!

Draw the circled Feynman diagram with tikz-feynman and put it in the LaTeX document at the place where it appears on the board. If the circle encloses several diagrams, draw all of them.

**Draw what is on the board, not the textbook version.** Keep the user's topology, orientation and rough layout, their line types and arrow directions, and only the labels they wrote. Don't add particle names, momenta or vertex dots that aren't there. If the diagram looks physically wrong (charge or fermion number not conserved at a vertex, a missing arrow), draw it as written and mention it in Notes.

**Read each element deliberately.** Hand-drawn diagrams have their own confusions, and each one is a question, not a guess:

- Line type: wavy (photon, W, Z) vs curly (gluon) vs dashed (scalar) vs dotted (ghost) vs plain. Wavy and curly are easy to mix up when drawn quickly, and so are dashed and dotted.
- Whether a fermion line has an arrow, and which way it points
- Whether two lines that touch meet at a vertex or simply cross
- Which line or vertex each label belongs to; momentum arrows and their direction; Lorentz or colour indices
- Vertex decorations: dot, blob, cross (counterterm or insertion)
- Which legs are external, and the time direction if the board indicates one

**Map board elements to tikz-feynman styles:**

| On the board | tikz-feynman |
| --- | --- |
| Fermion line with arrow | `fermion` (`anti fermion` reverses the arrow) |
| Wavy line (photon, W, Z) | `photon` |
| Curly line (gluon) | `gluon` |
| Dashed line (scalar) | `scalar`; with an arrow, `charged scalar` |
| Dotted line (ghost) | `ghost` |
| Plain line, no arrow | `plain` |
| Label on a line | `edge label=\(\gamma\)` (`edge label'` puts it on the other side) |
| Momentum arrow beside a line | `momentum=\(p\)` (`momentum'` for the other side) |
| Curved line or loop | `half left`, `half right`, `quarter left`, or `out=…, in=…` |
| Vertex dot, blob, cross | `\vertex[dot]`, `\vertex[blob]`, `\vertex[crossed dot]` |

**Place every vertex by hand.** Use `\vertex (name) at (x,y)` with coordinates that follow the board's layout, and draw the lines with `\diagram*`. Don't use tikz-feynman's automatic layout (`\feynmandiagram`, or `\diagram` without the star): it rearranges the diagram away from what the user drew, and it only works under LuaLaTeX. Manual placement keeps the user's layout and compiles with ordinary pdflatex.

**Mark what you can't read, and still draw the rest.** Drawing is transcription, so unlike the other commands, a diagram with unclear parts is still drawn. Draw a line whose type you can't read as `plain, red` with `edge label=\(\unclear{n}\)`, so you don't commit to a type. Put an `\unclear{n}` marker where an unreadable label or arrow belongs. Draw everything that is clear normally.

**Placement:**

- A diagram on its own goes in a `center` environment, not a floating `figure`, so it stays in the board's order, with a blue `\textcolor{blue}{[F1]}` label underneath.
- A diagram that is part of an equation (e.g. iℳ = diagram + diagram, or with symmetry factors in front) goes inline as a `tikzpicture` with `[baseline=(current bounding box.center)]`, with the surrounding math transcribed as written. Tag the equation with the user's number, or a blue `[F1]` if it has none.

Example of a standalone diagram:

```latex
\begin{center}
\begin{tikzpicture}
\begin{feynman}
\vertex (a1) at (0,1.2) {\(e^-\)};
\vertex (a2) at (0,-1.2) {\(e^+\)};
\vertex[dot] (b) at (1.5,0) {};   % [dot] only if the board shows a dot
\vertex[dot] (c) at (3.5,0) {};
\vertex (d1) at (5,1.2) {\(\mu^-\)};
\vertex (d2) at (5,-1.2) {\(\mu^+\)};
\diagram* {
  (a1) -- [fermion, momentum=\(p_1\)] (b) -- [fermion] (a2),
  (b) -- [photon, edge label=\(\gamma\), momentum'=\(q\)] (c),
  (d2) -- [fermion] (c) -- [fermion] (d1),
};
\end{feynman}
\end{tikzpicture}\\
\textcolor{blue}{[F1]}
\end{center}
```

Example of diagrams inside an equation, with a line whose type is unclear:

```latex
\begin{equation}
i\mathcal{M} =
\begin{tikzpicture}[baseline=(current bounding box.center)]
\begin{feynman}
\vertex (i) at (0,0);
\vertex (v1) at (1,0);
\vertex (v2) at (2.6,0);
\vertex (o) at (3.6,0);
\diagram* {
  (i) -- [scalar] (v1),
  (v1) -- [gluon, half left] (v2),
  (v1) -- [ghost, half right] (v2),
  (v2) -- [plain, red, edge label'=\(\unclear{1}\)] (o),
};
\end{feynman}
\end{tikzpicture}
+ \dots
\tag*{\textcolor{blue}{[F2]}}
\end{equation}
```

**Check the drawing by looking at it.** Compile the document (`pdflatex`), render the page to an image (e.g. `pdftoppm -png -r 110`), view the image and compare it with the photo element by element: the number of vertices and external legs, each line's type and arrow direction, every label and momentum arrow, and the overall layout. Fix and recompile until they match. Reading the TikZ code is not enough, because a swapped coordinate or a reversed arrow is easy to miss in code and obvious in the picture. If you can't compile in this environment, say clearly that the diagram code has not been compiled or checked.

### Commands and unclear symbols

Do not carry out "Calculate this!" or "Check this!" on anything that contains an `\unclear{}` marker. Hold it as pending, and do it once the user resolves the marker. "Feynman!" is the exception: draw the diagram with its unclear parts marked, as described above, and update the drawing once the user answers.

## Workflow

### 1. Survey the whole board first

Before transcribing anything, look at all the images and work out the layout: main derivation, side calculations, boxed results, arrows, numbered equations, board commands, diagrams, and crossed-out or erased material. If there are several photos, work out their order and any overlap between them so nothing is duplicated or dropped. If the order isn't clear, ask.

### 2. Transcribe faithfully

Transcribe what is written, not what you think should be written. If an expression looks wrong (a sign error, a dimension mismatch, a missing factor), transcribe it exactly as written and mention the possible issue in the Notes section. Never correct the user's physics inside the transcription.

- Follow the board's logical flow. Put side calculations in their own clearly labelled blocks.
- Keep the user's own equation labels with `\tag{}`.
- Use `\boxed{}` for results the user boxed on the board.
- Leave struck-through material out of the main transcription, but mention it in Notes, since it may be a deliberate correction.
- Feynman diagrams circled with "Feynman!" are drawn (see "Feynman!" above). For any other diagram (an uncommanded Feynman diagram, a plot, a sketch, geometry), insert a placeholder comment describing the figure and ask whether they want it drawn. Don't attempt the drawing unprompted.
- For each unclear item, insert a numbered red marker `\unclear{1}`, `\unclear{2}`, … in the LaTeX at the exact spot, and list it as a question. Do not put a guess inside the marker.

### 3. Carry out the board commands

Follow the instructions for each command in "Board commands" above.

### 4. Respond in this order

**Needs your input** (only if there is anything). A numbered list matching the `\unclear{n}` markers and any questions about commands. For each one, say where it is on the board (e.g. "line 3, second term, the index on Γ") and give the candidate readings if you have them. Put this first so it isn't missed.

**LaTeX transcription.** A complete compilable document using the preamble below. Put it in a ```latex code block in the chat; if it's longer than about 60 lines and file creation is available, also save it as a `.tex` file. When "Feynman!" was used and file creation is available, always save the `.tex` and also give the user the compiled PDF, so they can see the diagram straight away. After the transcription, add a `\section*{Numerical evaluations}` for "Calculate this!" results (input values, result with sensible significant figures, units) and a `\section*{Derivation checks}` for "Check this!" verdicts, each referring to the equation by its tag. Include only the sections that apply.

**Results summary.** A short summary in the chat of each calculation, check and drawn diagram: the result or verdict, the constants and conventions used, which diagrams were drawn and whether they still have unclear parts, and any commands held back pending the user's answers.

**Notes.** Possible errors spotted elsewhere on the board, crossed-out material, diagrams left as placeholders. Keep this brief.

### 5. When the user answers

Replace the resolved `\unclear{}` markers, carry out any commands that were waiting on them, and give the complete updated `.tex` so the user always has one clean current copy. If something new turns out to be ambiguous, ask again.

## LaTeX preamble

```latex
\documentclass[11pt]{article}
\usepackage[margin=2.5cm]{geometry}
\usepackage{amsmath,amssymb,amsfonts,mathtools,bm}
\usepackage{physics}   % bra-ket, derivatives, commutators
\usepackage{slashed}   % Feynman slash notation
\usepackage{xcolor}
% Red marker for anything that needs the user's confirmation
\newcommand{\unclear}[1]{\textcolor{red}{\fbox{\scriptsize\textbf{?#1}}}}
\begin{document}
% transcription here
\end{document}
```

Add packages only as needed (e.g. `tensor` for complex index placement). When "Feynman!" is used, add this line after `xcolor`:

```latex
\usepackage[compat=1.1.0]{tikz-feynman}
```

With manually placed vertices (as required above) the document compiles with pdflatex; tikz-feynman's warning about not running LuaTeX can be ignored.

## Example of a good question list

> **Needs your input**
> 1. Line 2, the subscript on the first g: I can read it as μν or μv. Which is it?
> 2. Eq. (4) is circled with "Calculate this!", but m and L aren't given anywhere on the board. What values (and units) should I use?
> 3. The "Check this!" circle on the right covers lines 5–6 only. Should I check just the step from 5 to 6, or the whole chain from eq. (2)?
> 4. Bottom left, "≈ ?" is written next to the expression for τ, without a circle or command. Do you want it calculated?
> 5. In the "Feynman!" diagram, the internal line between the two vertices (red ?5 in the drawing): is it wavy (photon) or curly (gluon)?
> 6. Same diagram, the lower-left leg: I can't see whether its arrow points into the vertex or away from it. Which way does it go?
