# How to trap a microwave on a metal ridge

An interactive, scrollable explainer of a PhD thesis on **ridge gap waveguides**: a way to
carry microwave signals in a thin air gap above a metal ridge, fenced in by a "bed of nails".

**Live page:** https://ved-cmpt.github.io/rgw-explainer/

It is written for beginners (no electrical engineering background needed) and tries to stay
accurate enough for specialists. You learn by playing: drag a slider and watch the wave stay on
the ridge or leak away, build your own "wave fence", click the ports of a one-way roundabout
for signals, and steer an antenna beam with frequency.

## What is on the page

- A plain-language introduction to microwaves and why they need guiding
- The ridge gap waveguide idea, with a live wave animation
- A band-gap calculator for the pin "fence"
- A tour of the thesis chapter by chapter: connectors, measuring the band gap, pin shapes,
  power divider, coupler, circulator, fabric measurement, and a beam-steering antenna
- Every result on one chart, marked as measured or simulated
- A critical take, a glossary with hover/tap definitions, and a short self-check quiz

## The thesis

> Shokry I. Shamseldin, *Analysis and Design of Microwave Devices Based on Ridge Gap Waveguide
> Technology*, PhD thesis, Department of Electrical and Computer Engineering,
> Concordia University, Montréal, 2016. Supervisor: Dr. Ahmed A. Kishk.

Official record: https://spectrum.library.concordia.ca/id/eprint/981921/

This is an **independent student explainer. It is not affiliated with or endorsed by the author
or Concordia University.** All thesis content (ideas, results, numbers) belongs to its author.
The explanations here are in my own words, every diagram is drawn from scratch in code, and no
figures or text passages from the thesis are reproduced. Diagrams marked "simplified
illustration" use toy physics to build intuition; they are not simulations.

## Run it locally

No build step and no dependencies. Download the repository and double-click `index.html`.

```
index.html   the page
styles.css   layout, light and dark themes
script.js    the interactive diagrams (plain JavaScript, SVG and canvas)
```

## Licence

The code in this repository is released under the [MIT License](LICENSE). The thesis itself is
not part of this repository and remains the property of its author.
